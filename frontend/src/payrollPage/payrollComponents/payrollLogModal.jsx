export default function PayrollLogModal({ modalRef, children }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div ref={modalRef} className="p-6 bg-white rounded-lg shadow-lg max-w-[600px] w-full">
        {children}
      </div>
    </div>
  );
}
