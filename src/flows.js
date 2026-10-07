// Copy and question sets for the two waitlist flows, verbatim from the design (Dova Splash.dc.html).

export const COUNTRIES = ['United States','Canada','United Kingdom','Ireland','Australia','New Zealand','Afghanistan','Albania','Algeria','Argentina','Armenia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Bermuda','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Bulgaria','Cambodia','Cameroon','Chile','China','Colombia','Costa Rica','Croatia','Cyprus','Czechia','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Fiji','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Lithuania','Luxembourg','Malaysia','Malta','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Namibia','Nepal','Netherlands','Nicaragua','Nigeria','North Macedonia','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar','Romania','Rwanda','Saudi Arabia','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Tanzania','Thailand','Trinidad and Tobago','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','Uruguay','Venezuela','Vietnam','Zambia','Zimbabwe','Somewhere else'];

export const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

export const FLOWS = {
  therapists: {
    label: 'For therapists',
    introTitle: 'A new partner for your couples practice',
    introBody: 'We\'re onboarding therapists in small groups. Tell us about your practice so we can find the right one for you.',
    introNote: 'Private by design. HIPAA-compliant.',
    doneBody: 'Dova onboards new therapists in small groups. We’ll be in touch for the next one.',
    steps: [
      { id: 'name', type: 'text', title: 'Your name', required: true, placeholder: 'First and last name', autoComplete: 'name', empty: 'Add your name to continue.' },
      { id: 'email', type: 'email', title: 'Email', required: true, placeholder: 'you@yourpractice.com', autoComplete: 'email' },
      { id: 'location', type: 'location', title: 'Where do you practice?', required: true },
      { id: 'years', type: 'single', title: 'How long have you been practicing?', options: ['Pre-licensed or associate', '1 to 5 years', '6 to 10 years', '11 to 15 years', '15+ years'] },
      { id: 'caseload', type: 'number', title: 'How many couples are you working with right now?', required: true, placeholder: 'e.g. 8' },
      { id: 'fee', type: 'single', title: 'What does a couples session with you cost?', required: true, options: ['Under $150', '$150 to $250', '$250 to $350', 'Over $350', 'Rather not say'] },
      { id: 'pay', type: 'single', title: 'How do couples usually pay you?', required: true, options: ['Private pay', 'A mix', 'Mostly insurance'] },
      { id: 'hardest', type: 'multi', title: "What's hardest in couples work right now?", helper: 'Pick two.', required: true, max: 2, other: 'onSomethingElse', otherLabel: 'Something else, in your words', otherHelper: '',
        options: ['Keeping both partners engaged', 'Staying even-handed when one partner pushes harder', 'Couples dropping out early', 'Fitting the work into the hour', 'Knowing whether the work is helping', 'Notes and admin', 'Something else'] },
      { id: 'source', type: 'text', title: 'How did you hear about Dova, or who introduced you?', helper: 'If a colleague already using Dova sent you, add their name so we can thank them.', placeholder: 'A colleague, a training, a post…' }
    ]
  },
  couples: {
    label: 'For couples',
    introTitle: 'Coaching that comes home with you',
    introBody: 'Dova comes through your therapist. A few questions so you hear when spots open near you.',
    introNote: 'Private by design. HIPAA-compliant.',
    doneBody: 'We’ll be in touch soon!',
    steps: [
      { id: 'name', type: 'text', title: 'First name', required: true, placeholder: 'Your first name', autoComplete: 'given-name', empty: 'Add your first name to continue.' },
      { id: 'email', type: 'email', title: 'Email', required: true, placeholder: 'you@example.com', autoComplete: 'email' },
      { id: 'location', type: 'location', title: 'Where are you based?', required: true },
      { id: 'therapist', type: 'single', title: 'Are you working with a couples therapist right now?', required: true, options: ['Yes', 'Not right now, but have before', 'No, looking for one', 'Not sure yet'] },
      { id: 'referral', type: 'referral', title: 'Would you like Dova to reach out to them?', showIf: (a) => a.therapist === 'Yes' },
      { id: 'goals', type: 'multi', title: 'What are you hoping to work on?', helper: 'Choose up to three.', required: true, max: 3, other: 'onSomethingElse', otherLabel: 'Something else, in your words', otherHelper: '',
        options: ['Communicating and handling conflict better', 'Feeling closer', 'Feeling appreciated and understood', 'Rebuilding trust', 'Working as a team: decisions, stress, money, parenting', 'Bringing back intimacy', 'Having more fun together', 'Something else'] },
      { id: 'source', type: 'text', title: 'How did you hear about Dova?', placeholder: 'A friend, your therapist, a post…' }
    ]
  }
};
