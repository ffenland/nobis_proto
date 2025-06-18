"use server";

import { redirect } from "next/navigation";
import { getSession } from "../lib/session";

export const logout = async () => {
  const session = await getSession();
  if (session) {
    session.destroy();
    // redirect to login page
    redirect("/login");
  }
};
