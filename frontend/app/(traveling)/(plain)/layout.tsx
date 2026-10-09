import { MainHeader } from "@/components/layout/main-header";

/** Pages about the account: the mark and the account controls only (captures E1, E2). */
export default function PlainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MainHeader variant="plain" />
      {children}
    </>
  );
}
