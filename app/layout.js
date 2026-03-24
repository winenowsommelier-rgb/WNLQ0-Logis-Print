import "./globals.css";

export const metadata = {
  title: "Warehouse Label Printer",
  description: "Batch-generate print-ready warehouse labels from purchase order PDFs."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
