// faq.js
// Frequently Asked Questions for Gulder Ultimate Returns

const FAQS = [
  {
    question: "What is this platform?",
    answer:
      "As part of our current promotional campaign, we have introduced the Gulder Ultimate Search (Online Version), giving participants the opportunity to win exciting prizes online alongside our offline customers. To participate, simply register, share your unique referral link to promote our product, and play the trivia game to earn points. The more genuine referrals you make and the better you perform in the trivia game, the higher your chances of qualifying for amazing rewards."
  },

{
    question: "What do I stand to win?",
    answer:
      "Participants in the Gulder Ultimate Search (Online Version) stand a chance to win exciting prizes, including: ₦20,000 cash prizes for 20 winners every week. ₦5,000,000 grand cash prize for 1 winner every month. 1 brand-new Toyota SUV as the grand prize. Other exciting prizes such as laptops, refrigerators, and smartphones. For our esteemed offline customers, simply check specially marked Gulder crown corks for instant prizes, including laptops, refrigerators, bags, umbrellas, smartphones, and unique codes that qualify you for the ₦5,000,000 Mega Draw and the Toyota SUV Grand Prize."
  },

  {
    question: "How do I register?",
    answer:
      "Click the Register button, enter your full name, valid Nigerian phone number, password, state, and LGA, then submit the registration form."
  },

  {
    question: "How do I earn points?",
    answer:
      "You earn points by playing trivia games by answering questions correctly (each correct answer = 100 points),, referring friends with your referral code (each valid referral = 500 points), and participating in eligible promotional activities."
  },

  {
    question: "Where can I find my referral code?",
    answer:
      "Your unique referral code is generated automatically after registration and can be found in your dashboard after logging in."
  },

  {
    question: "What is the minimum point required to qualify for rewards?",
    answer:
      "You must accumulate at least 10,000 points before you become eligible for rewards and submission of bank details."
  },

  {
    question: "Why can't I submit my bank details?",
    answer:
      "The bank details section remains locked until your account reaches 10,000 points."
  },

  {
    question: "Will all my referrals count?",
    answer:
      "Only genuine and valid referrals count. Duplicate accounts, fake registrations, or referrals that violate our rules will not be counted."
  },

  {
    question: "What happens after I reach 10,000 points?",
    answer:
      "Your account enters our verification process. Before any reward is approved, all phone numbers you referred will be verified through SMS OTP to confirm they belong to the actual owners."
  },

  {
    question: "Why do you verify referred phone numbers?",
    answer:
      "Verification helps prevent fake accounts, duplicate registrations, self-referrals, and other forms of fraud. It ensures that rewards go only to genuine participants."
  },

  {
    question: "How does the referral verification work?",
    answer:
      "SMS OTP message will be sent to every phone number you referred. Those users will confirm ownership of their registered phone numbers through MANDATORY OTP. Successful verification is required before rewards are processed."
  },

  {
    question: "What happens if some of my referrals fail verification?",
    answer:
      "Any referral that cannot be verified or is found to be invalid may be removed from your qualifying referrals. This may affect your reward eligibility."
  },

  {
    question: "Do my referrals need to respond to the SMS?",
    answer:
      "Yes. Responding promptly helps us confirm ownership of the registered phone number and speeds up the reward verification process."
  },

  {
    question: "Can I create multiple accounts?",
    answer:
      "No. Only one account is permitted per participant. Multiple accounts may result in suspension or permanent disqualification."
  },

  {
    question: "Can I refer myself?",
    answer:
      "No. Self-referrals are strictly prohibited and will be removed during verification."
  },

  {
    question: "How often can I play the trivia game?",
    answer:
      "Gameplay follows the platform's daily participation rules. Once you have used your available attempts, you must wait until your next eligible play period."
  },

  {
    question: "How is the leaderboard calculated?",
    answer:
      "The leaderboard ranks participants according to their total accumulated points. Players with higher points appear higher on the leaderboard."
  },

  {
    question: "Does reaching 10,000 points guarantee payment?",
    answer:
      "No. Reaching 10,000 points only qualifies your account for verification. Rewards are processed only after successful verification of your referrals and compliance with all platform rules."
  },

  {
    question: "Can my reward request be rejected?",
    answer:
      "Yes. Rewards may be rejected if fake referrals, duplicate accounts, failed phone verification, incorrect bank information, or rule violations are detected."
  },

  {
    question: "Is my personal information safe?",
    answer:
      "Yes. Your information is used only for account management, referral verification, reward processing, and other legitimate platform operations."
  },

  {
    question: "Who can I contact if I need help?",
    answer:
      "Use the support or contact section of the website if you experience problems with registration, login, referrals, rewards, or account verification."
  },

  {
    question: "Can I change my referral code?",
    answer:
      "No. Your referral code is automatically generated during registration and cannot be changed."
  },

  {
    question: "What if someone registers without using my referral code?",
    answer:
      "Unfortunately, referrals cannot be added after registration has been completed. Users must enter your referral code during registration."
  },

  {
    question: "What happens if I provide incorrect bank details?",
    answer:
      "Please ensure your bank details are accurate before submitting them. Incorrect information may delay or prevent successful reward payment."
  }
];


// expose for legacy scripts
if (typeof window !== "undefined") window.FAQS = FAQS;
export { FAQS };
