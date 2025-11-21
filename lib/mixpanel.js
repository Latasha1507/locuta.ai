import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

if (MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage'
  });
}

export const Mixpanel = {
  // Identify user
  identify: (userId) => {
    mixpanel.identify(userId);
  },

  // Set user properties
  people: {
    set: (props) => {
      mixpanel.people.set(props);
    }
  },

  // Track events
  track: (eventName, properties = {}) => {
    mixpanel.track(eventName, properties);
  },

  // Track page views
  trackPageView: (pageName) => {
    mixpanel.track('Page View', { page: pageName });
  },

  // Reset (on logout)
  reset: () => {
    mixpanel.reset();
  }
};

export default Mixpanel;
```

### D) Add to Environment Variables

In `.env.local`:
```
NEXT_PUBLIC_MIXPANEL_TOKEN=your_token_here