import mixpanel from 'mixpanel-browser';

const IS_BROWSER = typeof window !== 'undefined';
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

// Initialize only in browser
if (IS_BROWSER && MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: false, // We'll track manually
    persistence: 'localStorage',
    ignore_dnt: false,
    loaded: function() {
      console.log('✅ Mixpanel initialized');
    }
  });
}

// Safe wrapper for all Mixpanel calls
const safeMixpanelCall = (fn) => {
  if (!IS_BROWSER) {
    console.warn('Mixpanel called on server - skipping');
    return;
  }
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel token not found');
    return;
  }
  try {
    fn();
  } catch (error) {
    console.error('Mixpanel error:', error);
  }
};

export const Mixpanel = {
  // User identification
  identify: (userId) => {
    safeMixpanelCall(() => mixpanel.identify(userId));
  },

  // Set user properties
  people: {
    set: (props) => {
      safeMixpanelCall(() => mixpanel.people.set(props));
    },
    setOnce: (props) => {
      safeMixpanelCall(() => mixpanel.people.set_once(props));
    },
    increment: (prop, amount = 1) => {
      safeMixpanelCall(() => mixpanel.people.increment(prop, amount));
    }
  },

  // Track events
  track: (eventName, properties = {}) => {
    safeMixpanelCall(() => {
      mixpanel.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    });
  },

  // Track page views
  trackPageView: (pageName, properties = {}) => {
    safeMixpanelCall(() => {
      mixpanel.track('Page Viewed', {
        page: pageName,
        ...properties
      });
    });
  },

  // Time events (for measuring duration)
  timeEvent: (eventName) => {
    safeMixpanelCall(() => mixpanel.time_event(eventName));
  },

  // Register super properties (sent with every event)
  registerSuperProperties: (props) => {
    safeMixpanelCall(() => mixpanel.register(props));
  },

  // Clear super properties
  unregisterSuperProperty: (prop) => {
    safeMixpanelCall(() => mixpanel.unregister(prop));
  },

  // Reset (logout)
  reset: () => {
    safeMixpanelCall(() => mixpanel.reset());
  },

  // Alias (for connecting pre-login and post-login identities)
  alias: (newId) => {
    safeMixpanelCall(() => mixpanel.alias(newId));
  }
};

export default Mixpanel;