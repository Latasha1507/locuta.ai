import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  featuredImage?: string;
  content: any;
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const spaceId = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID;
  const accessToken = process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN;

  if (!spaceId || !accessToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://cdn.contentful.com/spaces/${spaceId}/entries?access_token=${accessToken}&content_type=pageBlogPost&fields.slug=${slug}&include=2`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];

    const assetsMap = new Map();
    const entriesMap = new Map();
    
    if (data.includes?.Asset) {
      data.includes.Asset.forEach((asset: any) => {
        assetsMap.set(asset.sys.id, asset);
      });
    }
    
    if (data.includes?.Entry) {
      data.includes.Entry.forEach((entry: any) => {
        entriesMap.set(entry.sys.id, entry);
      });
    }

    let authorName = 'Locuta Team';
    if (item.fields.auther) {
      if (typeof item.fields.auther === 'string') {
        authorName = item.fields.auther;
      } else if (item.fields.auther?.sys?.id) {
        const authorEntry = entriesMap.get(item.fields.auther.sys.id);
        authorName = authorEntry?.fields?.name || 'Locuta Team';
      }
    }

    let featuredImageUrl = '';
    if (item.fields.featuredImage?.sys?.id) {
      const imageAsset = assetsMap.get(item.fields.featuredImage.sys.id);
      featuredImageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : '';
    }

    const calculateReadTime = (content: any): string => {
      if (!content) return '5 min read';
      const text = JSON.stringify(content);
      const wordCount = text.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / 200);
      return `${readTime} min read`;
    };

    return {
      title: item.fields.title || 'Untitled',
      slug: item.fields.slug || '',
      excerpt: item.fields.excerpt || '',
      category: item.fields.category || 'tips',
      author: authorName,
      date: item.fields.publishedDate || item.sys.createdAt
        ? new Date(item.fields.publishedDate || item.sys.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
      readTime: calculateReadTime(item.fields.content),
      featuredImage: featuredImageUrl,
      content: item.fields.content
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

function renderRichText(content: any) {
  if (!content || !content.content) {
    return null;
  }

  return content.content.map((node: any, index: number) => {
    switch (node.nodeType) {
      case 'paragraph':
        return (
          <p key={index} className="mb-6 text-gray-700 leading-relaxed text-lg">
            {node.content?.map((child: any, childIndex: number) => {
              if (child.nodeType === 'text') {
                let text = child.value;
                if (child.marks) {
                  child.marks.forEach((mark: any) => {
                    if (mark.type === 'bold') {
                      return <strong key={childIndex}>{text}</strong>;
                    }
                    if (mark.type === 'italic') {
                      return <em key={childIndex}>{text}</em>;
                    }
                  });
                }
                return text;
              }
              return null;
            })}
          </p>
        );
      
      case 'heading-1':
        return (
          <h1 key={index} className="text-4xl font-bold text-gray-900 mb-6 mt-8">
            {node.content?.[0]?.value}
          </h1>
        );
      
      case 'heading-2':
        return (
          <h2 key={index} className="text-3xl font-bold text-gray-900 mb-5 mt-8">
            {node.content?.[0]?.value}
          </h2>
        );
      
      case 'heading-3':
        return (
          <h3 key={index} className="text-2xl font-bold text-gray-900 mb-4 mt-6">
            {node.content?.[0]?.value}
          </h3>
        );
      
      case 'unordered-list':
        return (
          <ul key={index} className="list-disc list-inside mb-6 space-y-2 text-gray-700 text-lg ml-4">
            {node.content?.map((listItem: any, liIndex: number) => (
              <li key={liIndex} className="leading-relaxed">
                {listItem.content?.[0]?.content?.[0]?.value}
              </li>
            ))}
          </ul>
        );
      
      case 'ordered-list':
        return (
          <ol key={index} className="list-decimal list-inside mb-6 space-y-2 text-gray-700 text-lg ml-4">
            {node.content?.map((listItem: any, liIndex: number) => (
              <li key={liIndex} className="leading-relaxed">
                {listItem.content?.[0]?.content?.[0]?.value}
              </li>
            ))}
          </ol>
        );
      
      case 'blockquote':
        return (
          <blockquote key={index} className="border-l-4 border-purple-500 pl-6 py-2 mb-6 italic text-gray-700 text-lg bg-purple-50 rounded-r-lg">
            {node.content?.[0]?.content?.[0]?.value}
          </blockquote>
        );
      
      case 'hr':
        return <hr key={index} className="my-8 border-gray-200" />;
      
      default:
        return null;
    }
  });
}

// FIXED: Updated for Next.js 15 - params is now async
export default async function BlogPostPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  // Await params in Next.js 15
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const getCategoryEmoji = (category: string): string => {
    const emojiMap: { [key: string]: string } = {
      'public-speaking': '🎤',
      'communication': '👋',
      'content-creation': '🎬',
      'career': '💼',
      'tips': '💡'
    };
    return emojiMap[category] || '📝';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-gray-50 to-purple-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {post.featuredImage && (
        <div className="relative h-96 w-full overflow-hidden bg-gray-900">
          <img 
            src={post.featuredImage} 
            alt={post.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
      )}

      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-4xl">{getCategoryEmoji(post.category)}</span>
          <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-4 py-2 rounded-full capitalize">
            {post.category.replace('-', ' ')}
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          {post.title}
        </h1>

        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          {post.excerpt}
        </p>

        <div className="flex flex-wrap items-center gap-6 pb-8 mb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-5 h-5 text-purple-600" />
            <span className="font-semibold">{post.author}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>{post.date}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5 text-purple-600" />
            <span>{post.readTime}</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          {renderRichText(post.content)}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Share this article</h3>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Share on Twitter
            </button>
            <button className="px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors">
              Share on LinkedIn
            </button>
          </div>
        </div>
      </article>

      <section className="py-16 px-4 bg-gradient-to-br from-purple-600 to-blue-600 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Ready to Improve Your Speaking Skills?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start practicing with AI-powered feedback today
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-purple-600 px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateStaticParams() {
  const spaceId = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID;
  const accessToken = process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN;

  if (!spaceId || !accessToken) {
    return [];
  }

  try {
    const response = await fetch(
      `https://cdn.contentful.com/spaces/${spaceId}/entries?access_token=${accessToken}&content_type=pageBlogPost&select=fields.slug`
    );

    const data = await response.json();

    return data.items.map((item: any) => ({
      slug: item.fields.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}