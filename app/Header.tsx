import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <Link href="/">
          <Image 
            src="/logo.png"
            alt="Locuta AI"
            width={150}
            height={50}
            priority
          />
        </Link>
      </div>
    </header>
  )
}