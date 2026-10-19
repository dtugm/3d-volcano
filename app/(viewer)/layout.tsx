import Navbar from "@/components/navbar";

export default function ViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Navbar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
