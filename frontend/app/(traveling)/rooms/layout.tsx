import { MainHeader } from "@/components/layout/main-header";

/** A listing: the 80 px header of capture C1, which scrolls away with the page. */
export default function ListingLayout({ children }: LayoutProps<"/rooms">) {
  return (
    <>
      <MainHeader variant="listing" />
      {children}
    </>
  );
}
