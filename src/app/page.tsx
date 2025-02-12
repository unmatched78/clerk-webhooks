import prisma from "@/lib/db";

export default async function Home() {
  const users = await prisma.user.findMany();
  return (
    <div>
      <h1>Hello app</h1>
      {JSON.stringify(users)}
    </div>
  );
}
