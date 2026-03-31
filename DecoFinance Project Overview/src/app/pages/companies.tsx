import { useState } from 'react';
import { Link } from 'react-router';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Search, MapPin, Shield, Star, Users, CheckCircle, Award, ChevronRight,
  Building2, TrendingUp, Briefcase
} from 'lucide-react';

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${iconSize} ${i <= full ? 'text-yellow-400' : i === full + 1 && half ? 'text-yellow-300' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TrustScoreBadge({ score, grade }: { score: number; grade: string }) {
  const color = grade === 'A' ? 'bg-green-100 text-green-700 border-green-200' :
    grade === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    grade === 'C' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-red-100 text-red-700 border-red-200';
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${color}`}>
      <Shield className="w-3.5 h-3.5" />
      <span className="font-bold text-sm">{score.toLocaleString()}</span>
      <span className="text-xs opacity-75">Grade {grade}</span>
    </div>
  );
}

function getRatingLabel(rating: number): { label: string; color: string } {
  if (rating >= 4.8) return { label: 'Exceptional', color: 'text-green-600' };
  if (rating >= 4.5) return { label: 'Excellent', color: 'text-green-600' };
  if (rating >= 4.0) return { label: 'Great', color: 'text-blue-600' };
  if (rating >= 3.5) return { label: 'Good', color: 'text-blue-600' };
  return { label: 'Fair', color: 'text-gray-600' };
}

export default function Companies() {
  const { companies } = useData();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('trust_score');
  const [filterGrade, setFilterGrade] = useState('all');

  const filtered = companies
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.serviceArea || '').toLowerCase().includes(q) || (c.specialties || []).some(s => s.toLowerCase().includes(q));
      const matchGrade = filterGrade === 'all' || c.trustGrade === filterGrade;
      return matchSearch && matchGrade;
    })
    .sort((a, b) => {
      if (sortBy === 'trust_score') return b.creditScore - a.creditScore;
      if (sortBy === 'rating') return b.averageRating - a.averageRating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'projects') return (b.projectsCompleted || 0) - (a.projectsCompleted || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Renovation Companies</h1>
            <p className="text-gray-500 mt-1">Browse verified contractors ranked by DecoFinance Trust Score</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by company name, location or specialty..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Trust Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trust_score">Recommended (Trust Score)</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="reviews">Most Reviewed</SelectItem>
                    <SelectItem value="projects">Most Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{filtered.length}</span> verified companies
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <Shield className="w-3 h-3" />
              Ranked by DecoFinance Trust Score
            </div>
          </div>

          {/* Company List */}
          <div className="space-y-4">
            {filtered.map((company, index) => {
              const { label: ratingLabel, color: ratingColor } = getRatingLabel(company.averageRating);
              return (
                <div key={company.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-blue-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Rank + Avatar */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-400">{index + 1}.</span>
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden border-2 border-blue-100">
                          {company.avatar ? (
                            <img src={company.avatar} alt={company.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-7 h-7 text-blue-600" />
                          )}
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-base">{company.name}</h3>
                              {company.trustGrade === 'A' && (
                                <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs gap-1">
                                  <Award className="w-3 h-3" />Top Rated
                                </Badge>
                              )}
                              {company.licenceStatus === 'valid' && (
                                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs gap-1">
                                  <CheckCircle className="w-3 h-3" />Licensed Pro
                                </Badge>
                              )}
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`font-bold text-sm ${ratingColor}`}>{ratingLabel} {company.averageRating.toFixed(1)}</span>
                              <StarRating rating={company.averageRating} />
                              <span className="text-xs text-gray-400">({company.reviewCount} reviews)</span>
                            </div>

                            {/* Service area */}
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {company.serviceArea || company.address.split(',').slice(-2).join(',').trim()}
                            </div>
                          </div>

                          {/* Trust Score - Most Prominent */}
                          <div className="flex-shrink-0">
                            <TrustScoreBadge score={company.creditScore} grade={company.trustGrade} />
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(company.specialties || []).slice(0, 3).map(s => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {(company.specialties || []).length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{(company.specialties || []).length - 3} more</span>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-5 mt-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            <span>{company.projectsCompleted || 0} projects</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>{company.employees} employees</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                            <span>Est. {new Date(company.established).getFullYear()}</span>
                          </div>
                        </div>

                        {/* Latest Review Snippet */}
                        {company.reviews.length > 0 && (
                          <div className="mt-3 text-sm text-gray-500 italic line-clamp-1">
                            <span className="font-medium not-italic text-gray-700">{company.reviews[0].customerName} says:</span>{' '}
                            "{company.reviews[0].comment.slice(0, 100)}{company.reviews[0].comment.length > 100 ? '...' : ''}"
                          </div>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0 self-center">
                        <Link to={`/companies/${company.id}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5 whitespace-nowrap">
                            View Profile
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No companies found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
