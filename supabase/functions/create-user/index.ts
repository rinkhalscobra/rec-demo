import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getJwtSubject(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded));
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
    return typeof claims.sub === "string" && claims.sub ? claims.sub : null;
  } catch (error) {
    console.error("JWT payload decode failed:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authorized
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || token === "undefined" || token === "null") {
      throw new Error("Unauthorized");
    }

    // Supabase Edge Gateway verifies this token before the function runs.
    // Decode the already-verified JWT payload locally so staff tokens do not
    // fail on Supabase Auth session lookups (`AuthSessionMissingError`).
    const requestingUserId = getJwtSubject(token);
    if (!requestingUserId) {
      console.error("JWT subject missing or expired");
      throw new Error("Unauthorized");
    }
    const requestingUser = { id: requestingUserId };


    // Check if requesting user has permission (admin, supervisor, or agent)
    const [{ data: roleData, error: roleError }, { data: creatorProfile }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("platform, group_id")
        .eq("id", requestingUser.id)
        .single(),
    ]);

    if (roleError) {
      throw new Error("Could not verify user role");
    }

    const creatorPlatform = creatorProfile?.platform || "brightfund";
    const userRole = roleData?.role;
    const isAdmin = userRole === "admin";
    const isGroupAdmin = userRole === "group_admin";
    const isSupervisor = userRole === "supervisor";
    const isAgent = userRole === "agent";

    if (!isAdmin && !isGroupAdmin && !isSupervisor && !isAgent) {
      throw new Error("Only staff members can create users");
    }

    // Get request body
    const { email: rawEmail, password, firstName, lastName, username, phone, role, createdBy, assignedTo } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !password || !role) {
      throw new Error("Missing required fields: email, password, role");
    }

    // The application has one workspace. Never require a group choice from a caller.
    const { data: groupId, error: workspaceError } = await supabaseAdmin.rpc('get_default_group_id', { _platform: creatorPlatform });
    if (workspaceError || !groupId) throw new Error('Could not load the workspace. Please try again.');

    // Validate role permissions
    // Admins can create any role except admin through bulk
    // Group Admins can create supervisors, agents and users in their group (not admin or group_admin)
    // Supervisors can only create agents and users in their group
    // Agents can only create users assigned to themselves

    if (isAgent) {
      if (role !== "user") {
        throw new Error("Agents can only create client accounts");
      }
    } else if (isSupervisor) {
      if (!["agent", "user"].includes(role)) {
        throw new Error("Supervisors can only create agents or clients");
      }
      // Verify supervisor is in the same group
      if (creatorProfile?.group_id !== groupId) {
        throw new Error("This account is not assigned to the workspace");
      }
    } else if (isGroupAdmin) {
      if (!["supervisor", "agent", "user"].includes(role)) {
        throw new Error("Group admins can only create supervisors, agents, or clients");
      }
      // Verify group admin is in the same group
      if (creatorProfile?.group_id !== groupId) {
        throw new Error("This account is not assigned to the workspace");
      }
    } else if (isAdmin) {
      if (!["group_admin", "supervisor", "agent", "user"].includes(role)) {
        throw new Error("Invalid role. Must be group_admin, supervisor, agent, or user");
      }
    }

    const targetPlatform = creatorPlatform;
    // One account per email across every platform and role, including archived
    // profiles. Never manufacture an aliased address for a second account.
    const [emailMatch, displayEmailMatch] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1),
      supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("display_email", email)
        .limit(1),
    ]);
    if (emailMatch.error || displayEmailMatch.error) {
      throw new Error("Could not verify email availability. Please try again.");
    }
    if (emailMatch.data?.length || displayEmailMatch.data?.length) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "email_exists",
            error: "An account with this email already exists. Please use a different email.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    }

    console.log(`Creating user: ${email} role=${role} by=${userRole} platform=${targetPlatform}`);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        platform: targetPlatform,
        display_email: email,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      if (
        createError.code === "email_exists" ||
        createError.message.toLowerCase().includes("already been registered")
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "email_exists",
            error: "A user with this email address already exists. Please use a different email.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    const userId = newUser.user.id;
    console.log(`User created with ID: ${userId}`);

    // Determine who the user should be assigned to
    let finalAssignedTo = assignedTo;
    if (isAgent && role === "user") {
      // Agents creating clients - auto-assign to themselves
      finalAssignedTo = requestingUser.id;
    }

    // Store the same normalized email used by Supabase Auth.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        group_id: groupId,
        created_by: createdBy || requestingUser.id,
        first_name: firstName,
        last_name: lastName,
        username: typeof username === 'string' ? username.trim() || null : null,
        phone: typeof phone === 'string' ? phone.trim() || null : null,
        assigned_to: finalAssignedTo || null,
        platform: targetPlatform,
        email: email,
        display_email: email,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) throw new Error('Account setup failed and could not be rolled back. Please contact an administrator.');
      throw new Error(`Account was not created: ${profileError.message}`);
    }

    // Create the user role (skip for regular users as they have no entry in user_roles)
    if (role !== "user") {
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleInsertError) {
        console.error("Error inserting role:", roleInsertError);
        const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (cleanupError) throw new Error('Role assignment failed and could not be rolled back. Please contact an administrator.');
        throw new Error(`Account was not created: ${roleInsertError.message}`);
      }
    }

    console.log(`User ${email} created successfully with role ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        email,
        role,
        platform: targetPlatform,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-user function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
