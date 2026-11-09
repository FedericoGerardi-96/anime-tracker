"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signupErrorMessage } from "@/lib/auth-signup";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // You could handle redirecting with an error message in URL
    redirect("/login?error=Could not authenticate user");
  }

  redirect("/");
}

export async function register(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password
    || typeof username !== "string" || !username.trim()) {
    redirect("/register?" + new URLSearchParams({ error: signupErrorMessage("validation_failed") }));
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const emailRedirectTo = origin && URL.canParse("/auth/callback", origin)
    ? new URL("/auth/callback", origin).href
    : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: username.trim() },
      emailRedirectTo,
    }
  });

  if (error) {
    redirect("/register?" + new URLSearchParams({ error: signupErrorMessage(error.code) }));
  }

  if (!data.session) redirect("/register?confirm=1");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await (await import('next/headers')).headers();
  const origin = headersList.get('origin') || headersList.get('referer');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?error=Could not authenticate with Google");
  }

  if (data.url) {
    redirect(data.url); // Redirect to Google login page
  }
}
