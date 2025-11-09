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
  content?: any;
}

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All Articles', icon: BookOpen },
    { id: 'public-speaking', name: 'Public Speaking', icon: Mic },
    { id: 'communication', name: 'Communication Skills', icon: Users },
    { id: 'content-creation', name: 'Content Creation', icon: Video },
    { id: 'career', name: 'Career Growth', icon: Briefcase },
    { id: 'tips', name: 'Tips & Techniques', icon: TrendingUp }
  ];

  // Fetch blog posts from Contentful
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const spaceId = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID;
        const accessToken = process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN;

        if (!spaceId || !accessToken) {
          console.error('Contentful credentials not found');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://cdn.contentful.com/spaces/${spaceId}/entries?access_token=${accessToken}&content_type=blogPost&order=-fields.date`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }

        const data = await response.json();
        
        const posts: BlogPost[] = data.items.map((item: any) => ({
          title: item.fields.title,
          slug: item.fields.slug,
          excerpt: item.fields.excerpt,
          category: item.fields.category,
          author: item.fields.author,
          date: new Date(item.fields.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          readTime: item.fields.readTime,
          featured: item.fields.featured || false,
          content: item.fields.content
        }));

        setBlogPosts(posts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  // Get emoji based on category
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

      {/* Search & Categories */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-purple-50 border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
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

          {/* Category Pills */}
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

      {/* Featured Articles */}
      {!loading && selectedCategory === 'all' && searchQuery === '' && featuredPosts.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Featured Articles</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {featuredPosts.map((post, idx) => (
                <article
                  key={idx}
                  className="group bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer border-2 border-purple-100"
                >
                  <div className="p-8">
                    <div className="text-6xl mb-4">{getCategoryEmoji(post.category)}</div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-semibold text-purple-600 bg-white px-3 py-1 rounded-full">
                        Featured
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-3 text-gray-800 leading-tight group-hover:text-purple-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        <p className="font-semibold text-gray-700">{post.author}</p>
                        <p className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {post.date}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Articles Grid */}
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
                <p className="text-gray-500 text-lg">
                  {blogPosts.length === 0 
                    ? 'No articles yet. Add your first blog post in Contentful!' 
                    : 'No articles found matching your search.'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map((post, idx) => (
                  <article
                    key={idx}
                    className="group bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="text-5xl mb-4">{getCategoryEmoji(post.category)}</div>
                      
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