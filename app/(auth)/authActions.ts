"use server";

import { redirect } from "next/navigation";
import { getCurrentIronSession } from "../lib/session";

export const logout = async () => {
  const session = await getCurrentIronSession();
  if (session.id) {
    session.destroy();
    // redirect to login page
    redirect("/login");
  }
};
