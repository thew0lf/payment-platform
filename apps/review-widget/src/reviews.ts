/**
 * AVNZ Reviews Widget
 *
 * Embeddable product review widget for any website.
 * Usage: <div id="avnz-reviews" data-company="xxx" data-product="yyy"></div>
 *        <script src="https://widget.avnz.io/reviews.js" async></script>
 */

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  reviewerName: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  merchantResponse: string | null;
  merchantRespondedAt: string | null;
  createdAt: string;
  media?: { url: string; thumbnailUrl: string | null; type: string }[];
}

interface ProductSummary {
  productId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  verifiedReviews: number;
}

interface WidgetConfig {
  enabled: boolean;
  showVerifiedBadge: boolean;
  showReviewerName: boolean;
  showReviewDate: boolean;
  allowAnonymous: boolean;
  allowMedia: boolean;
  allowProsAndCons: boolean;
  widgetTheme: string;
  widgetPrimaryColor: string;
}

// API URL - can be overridden via data attribute or window variable
const API_URL = (window as any).AVNZ_API_URL || 'https://api.avnz.io';

class AVNZReviewsWidget {
  private container: HTMLElement;
  private companyId: string;
  private productId: string | null;
  private reviews: Review[] = [];
  private summary: ProductSummary | null = null;
  private config: WidgetConfig | null = null;
  private page = 1;
  private hasMore = true;
  private loading = false;
  private sortBy = 'newest';

  constructor(container: HTMLElement) {
    this.container = container;
    this.companyId = container.dataset.company || '';
    this.productId = container.dataset.product || null;

    if (!this.companyId) {
      console.error('AVNZ Reviews: data-company attribute is required');
      return;
    }

    this.init();
  }

  private async init(): Promise<void> {
    this.injectStyles();
    this.render();
    await this.loadConfig();
    await this.loadSummary();
    await this.loadReviews();
  }

  private injectStyles(): void {
    if (document.getElementById('avnz-reviews-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'avnz-reviews-styles';
    styles.textContent = `
      .avnz-reviews-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 100%;
        color: #1f2937;
      }
      .avnz-reviews-widget * {
        box-sizing: border-box;
      }
      .avnz-reviews-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }
      .avnz-reviews-summary {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .avnz-reviews-avg-rating {
        font-size: 3rem;
        font-weight: 700;
        color: var(--avnz-primary, #3B82F6);
        line-height: 1;
      }
      .avnz-reviews-stars {
        color: #fbbf24;
        font-size: 1.25rem;
        letter-spacing: 0.05em;
      }
      .avnz-reviews-count {
        color: #6b7280;
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }
      .avnz-reviews-distribution {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 200px;
      }
      .avnz-reviews-dist-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
      }
      .avnz-reviews-dist-label {
        width: 3rem;
        color: #6b7280;
      }
      .avnz-reviews-dist-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
      }
      .avnz-reviews-dist-fill {
        height: 100%;
        background: var(--avnz-primary, #3B82F6);
        transition: width 0.3s ease;
      }
      .avnz-reviews-dist-count {
        width: 2rem;
        text-align: right;
        color: #9ca3af;
      }
      .avnz-reviews-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .avnz-reviews-sort {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .avnz-reviews-sort select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: white;
        cursor: pointer;
      }
      .avnz-reviews-write-btn {
        background: var(--avnz-primary, #3B82F6);
        color: white;
        border: none;
        padding: 0.625rem 1.25rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .avnz-reviews-write-btn:hover {
        opacity: 0.9;
      }
      .avnz-reviews-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .avnz-review-card {
        padding: 1.25rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }
      .avnz-review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
      }
      .avnz-review-meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .avnz-review-author {
        font-weight: 600;
        color: #111827;
      }
      .avnz-review-badges {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
      .avnz-review-badge {
        font-size: 0.625rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        text-transform: uppercase;
        font-weight: 600;
      }
      .avnz-badge-verified {
        background: #dcfce7;
        color: #166534;
      }
      .avnz-review-date {
        font-size: 0.75rem;
        color: #6b7280;
      }
      .avnz-review-rating {
        color: #fbbf24;
      }
      .avnz-review-title {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.5rem;
        color: #111827;
      }
      .avnz-review-content {
        color: #374151;
        line-height: 1.625;
        font-size: 0.9375rem;
      }
      .avnz-review-media {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
        flex-wrap: wrap;
      }
      .avnz-review-media img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: transform 0.2s;
      }
      .avnz-review-media img:hover {
        transform: scale(1.05);
      }
      .avnz-review-helpful {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e5e7eb;
        font-size: 0.8125rem;
        color: #6b7280;
      }
      .avnz-review-helpful button {
        background: none;
        border: 1px solid #d1d5db;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.8125rem;
        transition: all 0.2s;
      }
      .avnz-review-helpful button:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
      .avnz-merchant-response {
        margin-top: 1rem;
        padding: 1rem;
        background: #eff6ff;
        border-radius: 0.375rem;
        border-left: 3px solid var(--avnz-primary, #3B82F6);
      }
      .avnz-merchant-response-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--avnz-primary, #3B82F6);
      }
      .avnz-merchant-response-content {
        font-size: 0.875rem;
        color: #374151;
        line-height: 1.5;
      }
      .avnz-reviews-load-more {
        display: flex;
        justify-content: center;
        margin-top: 1.5rem;
      }
      .avnz-reviews-load-more button {
        background: white;
        border: 1px solid #d1d5db;
        padding: 0.75rem 1.5rem;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .avnz-reviews-load-more button:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
      .avnz-reviews-loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .avnz-reviews-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top-color: var(--avnz-primary, #3B82F6);
        border-radius: 50%;
        animation: avnz-spin 0.8s linear infinite;
      }
      @keyframes avnz-spin {
        to { transform: rotate(360deg); }
      }
      .avnz-reviews-empty {
        text-align: center;
        padding: 3rem;
        color: #6b7280;
      }
      .avnz-reviews-empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .avnz-powered-by {
        text-align: center;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        font-size: 0.75rem;
        color: #9ca3af;
      }
      .avnz-powered-by a {
        color: var(--avnz-primary, #3B82F6);
        text-decoration: none;
      }
      @media (max-width: 640px) {
        .avnz-reviews-header {
          flex-direction: column;
        }
        .avnz-reviews-avg-rating {
          font-size: 2.5rem;
        }
        .avnz-reviews-distribution {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  private async loadConfig(): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/api/widget/reviews/config?companyId=${this.companyId}`);
      if (res.ok) {
        this.config = await res.json();
      }
    } catch (e) {
      console.warn('AVNZ Reviews: Could not load config', e);
    }
  }

  private async loadSummary(): Promise<void> {
    if (!this.productId) return;

    try {
      const res = await fetch(`${API_URL}/api/widget/reviews/products/${this.productId}/summary`);
      if (res.ok) {
        this.summary = await res.json();
        this.render();
      }
    } catch (e) {
      console.warn('AVNZ Reviews: Could not load summary', e);
    }
  }

  private async loadReviews(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    this.render();

    try {
      const params = new URLSearchParams({
        companyId: this.companyId,
        sortBy: this.sortBy,
        limit: '10',
        offset: String((this.page - 1) * 10),
      });

      if (this.productId) {
        params.set('productId', this.productId);
      }

      const res = await fetch(`${API_URL}/api/widget/reviews?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (this.page === 1) {
          this.reviews = data.reviews || [];
        } else {
          this.reviews = [...this.reviews, ...(data.reviews || [])];
        }
        this.hasMore = data.hasMore || false;
      }
    } catch (e) {
      console.error('AVNZ Reviews: Could not load reviews', e);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private renderStars(rating: number, size = '1rem'): string {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return `
      <span style="font-size: ${size}; color: #fbbf24;">
        ${'★'.repeat(fullStars)}${hasHalf ? '½' : ''}${'☆'.repeat(emptyStars)}
      </span>
    `;
  }

  private handleSort(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.sortBy = select.value;
    this.page = 1;
    this.reviews = [];
    this.loadReviews();
  }

  private handleLoadMore(): void {
    this.page++;
    this.loadReviews();
  }

  private async handleVote(reviewId: string, isHelpful: boolean): Promise<void> {
    try {
      await fetch(`${API_URL}/api/widget/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful }),
      });
      // Refresh reviews to show updated counts
      this.page = 1;
      this.loadReviews();
    } catch (e) {
      console.error('AVNZ Reviews: Could not submit vote', e);
    }
  }

  private render(): void {
    const summary = this.summary;
    const reviews = this.reviews;

    this.container.innerHTML = `
      <div class="avnz-reviews-widget">
        ${summary ? this.renderSummary(summary) : ''}

        <div class="avnz-reviews-controls">
          <div class="avnz-reviews-sort">
            <label>Sort by:</label>
            <select id="avnz-sort-select">
              <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>Newest</option>
              <option value="oldest" ${this.sortBy === 'oldest' ? 'selected' : ''}>Oldest</option>
              <option value="highest" ${this.sortBy === 'highest' ? 'selected' : ''}>Highest Rated</option>
              <option value="lowest" ${this.sortBy === 'lowest' ? 'selected' : ''}>Lowest Rated</option>
              <option value="helpful" ${this.sortBy === 'helpful' ? 'selected' : ''}>Most Helpful</option>
            </select>
          </div>
          <button class="avnz-reviews-write-btn" id="avnz-write-review">Write a Review</button>
        </div>

        ${this.loading && reviews.length === 0 ? `
          <div class="avnz-reviews-loading">
            <div class="avnz-reviews-spinner"></div>
          </div>
        ` : reviews.length === 0 ? `
          <div class="avnz-reviews-empty">
            <div class="avnz-reviews-empty-icon">📝</div>
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ` : `
          <div class="avnz-reviews-list">
            ${reviews.map((review) => this.renderReview(review)).join('')}
          </div>

          ${this.hasMore ? `
            <div class="avnz-reviews-load-more">
              <button id="avnz-load-more">${this.loading ? 'Loading...' : 'Load More Reviews'}</button>
            </div>
          ` : ''}
        `}

        <div class="avnz-powered-by">
          Powered by <a href="https://avnz.io" target="_blank" rel="noopener">AVNZ.IO</a>
        </div>
      </div>
    `;

    // Attach event listeners
    const sortSelect = this.container.querySelector('#avnz-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.handleSort(e));
    }

    const loadMoreBtn = this.container.querySelector('#avnz-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.handleLoadMore());
    }

    const writeBtn = this.container.querySelector('#avnz-write-review');
    if (writeBtn) {
      writeBtn.addEventListener('click', () => this.openReviewForm());
    }

    // Attach vote listeners
    this.container.querySelectorAll('[data-vote-helpful]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reviewId = btn.getAttribute('data-review-id');
        if (reviewId) this.handleVote(reviewId, true);
      });
    });

    this.container.querySelectorAll('[data-vote-unhelpful]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reviewId = btn.getAttribute('data-review-id');
        if (reviewId) this.handleVote(reviewId, false);
      });
    });
  }

  private renderSummary(summary: ProductSummary): string {
    const maxCount = Math.max(...summary.ratingDistribution.map((d) => d.count), 1);

    return `
      <div class="avnz-reviews-header">
        <div class="avnz-reviews-summary">
          <div class="avnz-reviews-avg-rating">${summary.averageRating.toFixed(1)}</div>
          <div>
            ${this.renderStars(summary.averageRating, '1.25rem')}
            <div class="avnz-reviews-count">
              ${summary.totalReviews} review${summary.totalReviews !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div class="avnz-reviews-distribution">
          ${[5, 4, 3, 2, 1]
            .map((rating) => {
              const dist = summary.ratingDistribution.find((d) => d.rating === rating);
              const count = dist?.count || 0;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return `
                <div class="avnz-reviews-dist-row">
                  <span class="avnz-reviews-dist-label">${rating} star${rating !== 1 ? 's' : ''}</span>
                  <div class="avnz-reviews-dist-bar">
                    <div class="avnz-reviews-dist-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="avnz-reviews-dist-count">${count}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private renderReview(review: Review): string {
    return `
      <div class="avnz-review-card">
        <div class="avnz-review-header">
          <div class="avnz-review-meta">
            <span class="avnz-review-author">${review.reviewerName || 'Anonymous'}</span>
            <div class="avnz-review-badges">
              ${review.isVerifiedPurchase ? '<span class="avnz-review-badge avnz-badge-verified">Verified Purchase</span>' : ''}
            </div>
          </div>
          <div>
            <div class="avnz-review-rating">${this.renderStars(review.rating)}</div>
            <div class="avnz-review-date">${this.formatDate(review.createdAt)}</div>
          </div>
        </div>

        ${review.title ? `<div class="avnz-review-title">${this.escapeHtml(review.title)}</div>` : ''}
        ${review.content ? `<div class="avnz-review-content">${this.escapeHtml(review.content)}</div>` : ''}

        ${review.media && review.media.length > 0 ? `
          <div class="avnz-review-media">
            ${review.media.map((m) => `<img src="${m.thumbnailUrl || m.url}" alt="Review media" loading="lazy">`).join('')}
          </div>
        ` : ''}

        <div class="avnz-review-helpful">
          <span>Was this review helpful?</span>
          <button data-vote-helpful data-review-id="${review.id}">👍 Yes (${review.helpfulCount})</button>
          <button data-vote-unhelpful data-review-id="${review.id}">👎 No (${review.unhelpfulCount})</button>
        </div>

        ${review.merchantResponse ? `
          <div class="avnz-merchant-response">
            <div class="avnz-merchant-response-header">
              💬 Merchant Response
            </div>
            <div class="avnz-merchant-response-content">${this.escapeHtml(review.merchantResponse)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private openReviewForm(): void {
    // For now, redirect to a review submission page or open a modal
    const reviewUrl = `https://reviews.avnz.io/submit?company=${this.companyId}${this.productId ? `&product=${this.productId}` : ''}`;
    window.open(reviewUrl, '_blank', 'width=600,height=700');
  }
}

// Auto-initialize widgets
function initAVNZReviews(): void {
  const containers = document.querySelectorAll<HTMLElement>('#avnz-reviews, [data-avnz-reviews]');
  containers.forEach((container) => {
    if (!container.dataset.initialized) {
      container.dataset.initialized = 'true';
      new AVNZReviewsWidget(container);
    }
  });
}

// Initialize on DOMContentLoaded or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAVNZReviews);
} else {
  initAVNZReviews();
}

// Also observe for dynamically added containers
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        if (node.id === 'avnz-reviews' || node.dataset.avnzReviews !== undefined) {
          initAVNZReviews();
        }
        const nested = node.querySelectorAll<HTMLElement>('#avnz-reviews, [data-avnz-reviews]');
        if (nested.length > 0) {
          initAVNZReviews();
        }
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

// Export for manual initialization
(window as any).AVNZReviews = {
  init: initAVNZReviews,
  Widget: AVNZReviewsWidget,
};
