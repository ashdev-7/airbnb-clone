import { MainHeader } from "@/components/layout/main-header";

/** The home page: the open header with the tabs and the search bar (capture A1). */
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MainHeader variant="home" />
      {children}
    </>
  );
}
