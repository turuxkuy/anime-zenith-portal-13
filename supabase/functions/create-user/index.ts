
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Create user function started")

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing create-user request");
    
    // Create a Supabase client with the service role key (for admin operations)
    // The service role bypasses RLS policies and should be used carefully
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request body
    const body = await req.json();
    const { email, password, username, role = 'user' } = body;
    
    console.log("Request data:", { email, username, role });
    
    // Validate inputs
    if (!email || !password || !username) {
      throw new Error('Email, password, and username are required');
    }
    
    // Create the user
    console.log("Creating user...");
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username
      }
    });
    
    if (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }

    console.log("User created successfully, creating profile...");

    // Create or update the user's profile in profiles table
    if (userData?.user) {
      console.log("Creating profile for user ID:", userData.user.id);
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userData.user.id,
        username,
        email,
        role
      });
      
      if (profileError) {
        console.error("Error creating profile:", profileError);
        throw profileError;
      }
      
      console.log("Profile created successfully");
    }

    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user: userData?.user 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201 
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
})
