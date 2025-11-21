import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel only in browser
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

if (typeof window !== 'undefined' && MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage'
  });
}

export const Mixpanel = {
  identify: (userId) => {
    if (typeof window !== 'undefined') {
      mixpanel.identify(userId);
    }
  },

  people: {
    set: (props) => {
      if (typeof window !== 'undefined') {
        mixpanel.people.set(props);
      }
    }
  },

  track: (eventName, properties = {}) => {
    if (typeof window !== 'undefined') {
      mixpanel.track(eventName, properties);
    }
  },

  trackPageView: (pageName) => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Page View', { page: pageName });
    }
  },

  reset: () => {
    if (typeof window !== 'undefined') {
      mixpanel.reset();
    }
  }
};

export default Mixpanel;