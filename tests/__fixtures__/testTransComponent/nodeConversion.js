import {Trans} from 'react-i18next';

// From https://react.i18next.com/latest/trans-component
const comp0 = (
  <Trans count={count}>
    Hello <strong title={t('nameTitle')}>{{name}}</strong>, you have {{count}} unread message. <Link to="/msgs">Go to messages</Link>.
  </Trans>
);

// JSX comments can mess up ordering
const comp1 = (
  <Trans>
    {/* comment before */}Hello <strong>{{name}}{/* comment in between */}</strong>,
    you are strong.{/* comment after */}
  </Trans>
);

// non-closing tags need special handling
const comp2 = (
  <Trans>
    Hi <strong>{{name}}<br /></strong>, how<br /> are you doing?
  </Trans>
);