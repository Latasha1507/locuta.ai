'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, Users, Mic, Video, Briefcase, Search, Calendar, Clock, ArrowRight } from 'lucide-react';

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  featuredImage?: string;
  content?: any;
}

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const categories = [
    { id: 'all', name: 'All Articles', icon: BookOpen },
    { id: 'public-speaking', name: 'Public Speaking', icon: Mic },
    { id: 'communication', name: 'Communication Skills', icon: Users },
    { id: 'content-creation', name: 'Content Creation', icon: Video },
    { id: 'career', name: 'Career Growth', icon: Briefcase },
    { id: 'tips', name: 'Tips & Techniques', icon: TrendingUp }
  ];

  const calculateReadTime = (content: any): string => {
    if (!content) return '5 min read';
    const text = JSON.stringify(content);
    const wordCount = text.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);
    return `${readTime} min read`;
  };

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const spaceId = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID;
        const accessToken = process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN;

        console.log('Space ID:', spaceId);
        console.log('Access Token exists:', !!accessToken);

        if (!spaceId || !accessToken) {
          setError('Contentful credentials not found in environment variables');
          setLoading(false);
          return;
        }

        // Try different content type IDs
        const contentTypes = ['blogPost', 'blog', 'post'];
        let successfulFetch = false;

        for (const contentType of contentTypes) {
          try {
            console.log(`Trying content type: ${contentType}`);
            
            const response = await fetch(
              `https://cdn.contentful.com/spaces/${spaceId}/entries?access_token=${accessToken}&content_type=${contentType}&include=2`
            );

            console.log(`Response status for ${contentType}:`, response.status);

            if (!response.ok) {
              const errorData = await response.json();
              console.error(`Error for ${contentType}:`, errorData);
              continue;
            }

            const data = await response.json();
            console.log(`Data for ${contentType}:`, data);
            setDebugInfo(data);

            if (data.items && data.items.length > 0) {
              console.log('Found items:', data.items.length);
              
              // Create maps for assets and entries
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

              const posts: BlogPost[] = data.items.map((item: any) => {
                console.log('Processing item:', item);
                
                // Get author name
                let authorName = 'Locuta Team';
                if (item.fields.author) {
                  if (typeof item.fields.author === 'string') {
                    authorName = item.fields.author;
                  } else if (item.fields.author?.sys?.id) {
                    const authorEntry = entriesMap.get(item.fields.author.sys.id);
                    authorName = authorEntry?.fields?.name || 'Locuta Team';
                  }
                }

                // Get featured image
                let featuredImageUrl = '';
                if (item.fields.featuredImage?.sys?.id) {
                  const imageAsset = assetsMap.get(item.fields.featuredImage.sys.id);
                  featuredImageUrl = imageAsset?.fields?.file?.url ? `https:${imageAsset.fields.file.url}` : '';
                }

                return {
                  title: item.fields.title || 'Untitled',
                  slug: item.fields.slug || '',
                  excerpt: item.fields.excerpt || '',
                  category: item.fields.category || 'tips',
                  author: authorName,
                  date: item.fields.publishedDate || item.sys.createdAt
                    ? new Date(item.fields.publishedDate || item.sys.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }),
                  readTime: calculateReadTime(item.fields.content),
                  featured: item.fields.featured || false,
                  featuredImage: featuredImageUrl,
                  content: item.fields.content
                };
              });

              setBlogPosts(posts);
              successfulFetch = true;
              break;
            }
          } catch (err) {
            console.error(`Error fetching with content type ${contentType}:`, err);
            continue;
          }
        }

        if (!successfulFetch) {
          setError('Could not find blog posts. Check content type ID.');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

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

  const filteredPosts = blogPosts.filter((post: BlogPost) => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = filteredPosts.filter((post: BlogPost) => post.featured);
  const regularPosts = filteredPosts.filter((post: BlogPost) => !post.featured);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-semibold">Blog & Insights</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Master Communication,
            <br />
            <span className="text-purple-200">One Article at a Time</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            Expert insights, practical techniques, and proven strategies to elevate your speaking skills
          </p>
        </div>
      </section>

      {/* Debug Section - REMOVE THIS AFTER FIXING */}
      {(error || debugInfo) && (
        <section className="py-8 px-4 bg-yellow-50 border-b-2 border-yellow-200">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Debug Information</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold">Error: {error}</p>
              </div>
            )}
            {debugInfo && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="font-semibold mb-2">Raw API Response:</p>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-4 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Search & Categories */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-purple-50 border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors text-gray-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:shadow-md border-2 border-gray-200'
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading articles...</p>
          </div>
        </section>
      )}

      {/* Articles */}
      {!loading && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">
                {selectedCategory === 'all' ? 'All Articles' : categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-gray-600">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
              </p>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">
                  {blogPosts.length === 0 
                    ? '📝 No articles found. Check the debug information above.' 
                    : 'No articles found matching your search.'}
                </p>
                <p className="text-sm text-gray-400">
                  Make sure your Contentful credentials are correct and your blog post is published.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post, idx) => (
                  <article
                    key={idx}
                    className="group bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer"
                  >
                    {post.featuredImage && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <img 
                          src={post.featuredImage} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      {!post.featuredImage && (
                        <div className="text-5xl mb-4">{getCategoryEmoji(post.category)}</div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full capitalize">
                          {post.category.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-3 text-gray-800 leading-tight group-hover:text-purple-600 transition-colors">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          <p className="font-semibold text-gray-700">{post.author}</p>
                          <p className="flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {post.date}
                          </p>
                        </div>
                        <button className="text-purple-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Never Miss an Article
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Get weekly communication tips and insights delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:border-white transition-colors"
            />
            <button className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all whitespace-nowrap">
              Subscribe
            </button>
          </div>
          <p className="text-white/70 text-sm mt-4">
            Join thousands of communicators. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;