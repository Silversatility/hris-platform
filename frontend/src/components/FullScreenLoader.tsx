import Spinner from './Spinner'

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8fafc]/80 backdrop-blur-sm">
      <Spinner className="h-10 w-10 text-[#111827]" />
    </div>
  )
}

export default FullScreenLoader
