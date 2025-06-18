"use server";

import { logoutSession } from "@/app/lib/session";

const LogoutButton = () => {
  return (
    <form action={logoutSession} className="flex justify-center items-center">
      <button type="submit" className="btn btn-error btn-sm btn-outline">
        Logout
      </button>
    </form>
  );
};

export default LogoutButton;
