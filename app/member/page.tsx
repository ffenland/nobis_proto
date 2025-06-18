import { getMemberInfo } from "./actions";
import Link from "next/link";
import MainHeader from "../components/base/main_header";

const Home = async () => {
  const { username } = await getMemberInfo();

  return (
    <main className="flex w-full flex-col gap-3">
      <MainHeader username={username} role={"MEMBER"} />
      <div>
        <Link href="/member/pt/new">
          <div className="btn">PT신청</div>
        </Link>
      </div>
    </main>
  );
};

export default Home;
