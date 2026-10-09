import { Footer } from "@/components/layout/footer";

/** The travelling pages: a header chosen by each group of pages, and the footer below. */
export default function TravelingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
