function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#1c2f4d]">{title}</h1>
      <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-[#5a6a85]">This page is coming soon.</p>
      </div>
    </div>
  )
}

export default ComingSoon
