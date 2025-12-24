'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  Check,
  X,
  Eye,
  Sparkles,
  ShoppingBag,
  User,
  Calendar,
  BadgeCheck,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  reviewsApi,
  Review,
  ReviewStatus,
  ReviewStats,
  getReviewStatusColor,
  getReviewStatusLabel,
  canModerateReview,
  canRespondToReview,
  formatRating,
} from '@/lib/api/reviews';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_FILTERS: { value: ReviewStatus | 'ALL'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'ALL', label: 'All Reviews', icon: Star },
  { value: 'PENDING', label: 'Pending', icon: Clock },
  { value: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { value: 'REJECTED', label: 'Rejected', icon: XCircle },
  { value: 'FLAGGED', label: 'Flagged', icon: AlertTriangle },
];

const STATUS_CONFIG: Record<ReviewStatus, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', icon: Clock },
  APPROVED: { label: 'Approved', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', icon: XCircle },
  FLAGGED: { label: 'Flagged', icon: AlertTriangle },
};

const RATING_FILTERS = [
  { value: 0, label: 'All Ratings' },
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 2, label: '2 Stars' },
  { value: 1, label: '1 Star' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ReviewStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', getReviewStatusColor(status))}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            starSize,
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'text-primary',
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card/50 border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function RatingDistributionBar({ rating, count, percentage }: { rating: number; count: number; percentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-12">{rating} stars</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
    </div>
  );
}

function ResponseModal({
  review,
  onClose,
  onSubmit,
}: {
  review: Review;
  onClose: () => void;
  onSubmit: (response: string) => void;
}) {
  const [response, setResponse] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Respond to Review</h3>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} />
            <span className="text-sm text-muted-foreground">by {review.reviewerName || 'Anonymous'}</span>
          </div>
          <p className="text-sm text-foreground">{review.content}</p>
        </div>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write your response..."
          className="w-full h-32 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(response)}
            disabled={!response.trim()}
            className="px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Submit Response
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | 'ALL'>('ALL');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [respondingToReview, setRespondingToReview] = useState<Review | null>(null);

  // Pagination
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Stats
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    flaggedReviews: 0,
    averageRating: 0,
    ratingDistribution: [],
    verifiedPurchaseRate: 0,
    responseRate: 0,
    averageResponseTime: null,
  });

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [selectedStatus, selectedRating, searchQuery, offset]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit,
        offset,
        sortBy: 'newest',
      };

      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }

      if (selectedRating > 0) {
        params.rating = selectedRating;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await reviewsApi.list(params);
      setReviews(data.reviews);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load reviews. Please try again.');
      // Clear data on error - no mock/fake data
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await reviewsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Keep default empty stats - no mock/fake data
    }
  };

  const handleApprove = async (reviewId: string) => {
    setProcessingAction(reviewId);
    try {
      const updated = await reviewsApi.moderate(reviewId, { status: 'APPROVED' });
      setReviews(reviews.map(r => r.id === reviewId ? updated : r));
    } catch (err) {
      console.error('Failed to approve review:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (reviewId: string, reason?: string) => {
    setProcessingAction(reviewId);
    try {
      const updated = await reviewsApi.moderate(reviewId, {
        status: 'REJECTED',
        rejectReason: reason || 'Rejected by moderator',
      });
      setReviews(reviews.map(r => r.id === reviewId ? updated : r));
    } catch (err) {
      console.error('Failed to reject review:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleFlag = async (reviewId: string) => {
    setProcessingAction(reviewId);
    try {
      const updated = await reviewsApi.moderate(reviewId, {
        status: 'FLAGGED',
        moderationNotes: 'Flagged for review',
      });
      setReviews(reviews.map(r => r.id === reviewId ? updated : r));
    } catch (err) {
      console.error('Failed to flag review:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRespond = async (reviewId: string, response: string) => {
    setProcessingAction(reviewId);
    try {
      const updated = await reviewsApi.respond(reviewId, { response });
      setReviews(reviews.map(r => r.id === reviewId ? updated : r));
      setRespondingToReview(null);
    } catch (err) {
      console.error('Failed to respond to review:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleToggleFeatured = async (reviewId: string) => {
    setProcessingAction(reviewId);
    try {
      const updated = await reviewsApi.toggleFeatured(reviewId);
      setReviews(reviews.map(r => r.id === reviewId ? updated : r));
    } catch (err) {
      console.error('Failed to toggle featured:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const toggleSelectReview = (reviewId: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviews(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Reviews</h1>
          <p className="text-sm text-muted-foreground">Moderate and manage customer reviews</p>
        </div>
        <Link
          href="/settings/reviews"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          Review Settings
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Reviews"
          value={stats.totalReviews}
          icon={Star}
        />
        <StatCard
          title="Pending Moderation"
          value={stats.pendingReviews}
          icon={Clock}
          color="text-yellow-400"
        />
        <StatCard
          title="Average Rating"
          value={formatRating(stats.averageRating)}
          icon={Star}
          color="text-yellow-400"
          subtitle={`${stats.verifiedPurchaseRate}% verified purchases`}
        />
        <StatCard
          title="Response Rate"
          value={`${stats.responseRate}%`}
          icon={MessageSquare}
          color="text-green-400"
          subtitle={stats.averageResponseTime ? `${stats.averageResponseTime}h avg response` : undefined}
        />
      </div>

      {/* Rating Distribution */}
      <div className="bg-card/50 border border-border rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {stats.ratingDistribution.map((dist) => (
            <RatingDistributionBar
              key={dist.rating}
              rating={dist.rating}
              count={dist.count}
              percentage={dist.percentage}
            />
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviews by content, product, or reviewer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedStatus === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => {
                  setSelectedStatus(filter.value);
                  setOffset(0);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Rating Filter */}
        <select
          value={selectedRating}
          onChange={(e) => {
            setSelectedRating(Number(e.target.value));
            setOffset(0);
          }}
          className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {RATING_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedReviews.size > 0 && (
        <div className="bg-cyan-900/20 border border-cyan-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-primary">
              {selectedReviews.size} review{selectedReviews.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={async () => {
                  setProcessingAction('bulk');
                  for (const id of Array.from(selectedReviews)) {
                    await handleApprove(id);
                  }
                  setSelectedReviews(new Set());
                  setProcessingAction(null);
                }}
                disabled={processingAction === 'bulk'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-foreground rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                Approve All
              </button>
              <button
                onClick={async () => {
                  setProcessingAction('bulk');
                  for (const id of Array.from(selectedReviews)) {
                    await handleReject(id);
                  }
                  setSelectedReviews(new Set());
                  setProcessingAction(null);
                }}
                disabled={processingAction === 'bulk'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-foreground rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card/50 border border-border rounded-xl p-4 hover:border-border transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedReviews.has(review.id)}
                    onChange={() => toggleSelectReview(review.id)}
                    className="mt-1 w-4 h-4 bg-muted border-border rounded text-cyan-600 focus:ring-primary focus:ring-offset-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} />
                      {review.isFeatured && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                          <Sparkles className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h3 className="text-sm font-medium text-foreground">{review.title}</h3>
                    )}
                  </div>
                </div>
                <StatusBadge status={review.status} />
              </div>

              {/* Content */}
              {review.content && (
                <p className="text-sm text-foreground mb-3 pl-7">{review.content}</p>
              )}

              {/* Pros/Cons */}
              {(review.pros.length > 0 || review.cons.length > 0) && (
                <div className="flex flex-col sm:flex-row gap-4 mb-3 pl-7">
                  {review.pros.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-green-400 font-medium mb-1">Pros</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {review.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-green-400">+</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.cons.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-red-400 font-medium mb-1">Cons</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {review.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-red-400">-</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Merchant Response */}
              {review.merchantResponse && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 mb-3 ml-7">
                  <p className="text-xs text-primary font-medium mb-1">Merchant Response</p>
                  <p className="text-sm text-foreground">{review.merchantResponse}</p>
                </div>
              )}

              {/* Meta & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-7 pt-3 border-t border-border">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {review.reviewerName || 'Anonymous'}
                  </span>
                  {review.product && (
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {review.product.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(review.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {review.helpfulCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {review.unhelpfulCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {canModerateReview(review) && (
                    <>
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={processingAction === review.id}
                        className="px-3 py-1.5 bg-green-600 text-foreground rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                        title="Approve"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(review.id)}
                        disabled={processingAction === review.id}
                        className="px-3 py-1.5 bg-red-600 text-foreground rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                        title="Reject"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {review.status === 'APPROVED' && !review.merchantResponse && (
                    <button
                      onClick={() => setRespondingToReview(review)}
                      disabled={processingAction === review.id}
                      className="px-3 py-1.5 bg-primary text-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50 text-xs font-medium"
                      title="Respond"
                    >
                      <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                      Respond
                    </button>
                  )}
                  {review.status === 'APPROVED' && (
                    <button
                      onClick={() => handleToggleFeatured(review.id)}
                      disabled={processingAction === review.id}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        review.isFeatured
                          ? 'bg-yellow-600 text-foreground hover:bg-yellow-700'
                          : 'bg-muted text-foreground hover:bg-muted'
                      )}
                      title={review.isFeatured ? 'Remove from featured' : 'Feature this review'}
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                      {review.isFeatured ? 'Unfeatured' : 'Feature'}
                    </button>
                  )}
                  {review.status !== 'FLAGGED' && review.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleFlag(review.id)}
                      disabled={processingAction === review.id}
                      className="p-1.5 text-muted-foreground hover:text-orange-400 transition-colors"
                      title="Flag for review"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-card/50 border border-border rounded-xl">
            <Star className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No reviews found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Customer reviews will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between p-4 mt-4 bg-card/50 border border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} reviews
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {respondingToReview && (
        <ResponseModal
          review={respondingToReview}
          onClose={() => setRespondingToReview(null)}
          onSubmit={(response) => handleRespond(respondingToReview.id, response)}
        />
      )}
    </div>
  );
}

