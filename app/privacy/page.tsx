export default function PrivacyPage() {
  const lastUpdated = '12 May 2026'
  const contactEmail = 'privacy@jobba.io' // update with your actual email

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated} · Version 1.0</p>

      <section className="space-y-8 text-sm leading-relaxed text-foreground">

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
          <p>
            Jobba is a job search assistant that uses artificial intelligence to match job seekers with
            relevant vacancies and help them apply. This service is operated as a personal project and
            will be updated with full company details before commercial launch.
            For privacy questions, contact: <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. What personal data we collect</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Account data:</strong> email address, name (when provided)</li>
            <li><strong>Resume / CV:</strong> the PDF file you upload and the text extracted from it — including your work history, education, and skills</li>
            <li><strong>Job preferences:</strong> job titles, location, preferred companies and sectors</li>
            <li><strong>Usage data:</strong> which jobs you viewed, saved, or applied to; cover letters and tailored resumes you generated</li>
            <li><strong>Email data:</strong> whether you opened or interacted with our digest emails</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Why we process your data</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>To provide the core service: daily job matching, cover letter generation, and resume tailoring</li>
            <li>To improve your results over time using the AI coach and your feedback</li>
            <li>To send you your daily job digest by email</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="mt-2">Legal basis: <strong>contract performance</strong> (providing the service you signed up for) and <strong>legitimate interest</strong> (improving service quality).</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. AI processing — how your resume is used</h2>
          <p>
            Your resume text is sent to <strong>Anthropic&apos;s Claude API</strong> for the following purposes:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Extracting your skills and generating job search terms</li>
            <li>Scoring job vacancies for fit against your profile</li>
            <li>Generating cover letters and tailored resume versions</li>
            <li>Generating follow-up questions to improve your matches</li>
          </ul>
          <p className="mt-2">
            <strong>Important:</strong> Anthropic does not use API inputs to train their AI models.
            Your resume is processed solely to return a response and is not retained for model training.
            See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Anthropic&apos;s Privacy Policy</a> for details.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Third-party services we use</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Supabase (EU — Frankfurt region):</strong> database and file storage. Your data is stored in the European Union. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Supabase Privacy Policy</a></li>
            <li><strong>Anthropic:</strong> AI processing of your resume and job descriptions. Data is not used for training. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Privacy Policy</a></li>
            <li><strong>Resend:</strong> email delivery for your daily digest. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline">Resend Privacy Policy</a></li>
            <li><strong>Adzuna, Nationale Vacaturebank, Intermediair:</strong> job listing sources. We display job listings from these platforms with attribution and link to original postings. We do not share your personal data with these providers.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Your rights under GDPR</h2>
          <p>As an EU resident, you have the right to:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Access:</strong> request a copy of your personal data</li>
            <li><strong>Rectification:</strong> correct inaccurate data</li>
            <li><strong>Erasure:</strong> delete your account and all associated data — available in Settings → Delete Account</li>
            <li><strong>Portability:</strong> receive your data in a portable format</li>
            <li><strong>Restriction:</strong> limit how we process your data</li>
            <li><strong>Object:</strong> object to certain types of processing</li>
          </ul>
          <p className="mt-2">To exercise any right, email <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>. We will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Data retention</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Your data is retained as long as your account is active</li>
            <li>When you delete your account, all personal data is permanently deleted within 30 days</li>
            <li>Job listings (not personal data) may be retained for service continuity</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Cookies</h2>
          <p>
            We use only strictly necessary cookies for authentication (session management via Supabase Auth).
            We do not use tracking, advertising, or analytics cookies. No cookie consent is required for
            strictly necessary cookies under GDPR.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. Changes to this policy</h2>
          <p>
            If we make material changes, we will notify you by email before the change takes effect.
            The version number and &quot;last updated&quot; date at the top of this page will always reflect the current version.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">10. Contact</h2>
          <p>
            For any privacy questions or to exercise your rights: <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>
          </p>
          <p className="mt-2">
            You also have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens):
            <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="underline ml-1">autoriteitpersoonsgegevens.nl</a>
          </p>
        </div>

      </section>
    </main>
  )
}
