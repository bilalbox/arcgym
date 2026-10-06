import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { Footer } from '@/components/layout/Footer';

interface TermsPageProps {
  navigate: (to: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ navigate }) => {
  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Terms of Service
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          ArcGym is an interactive architectural judgment gym operated by 23p Technologies LLC as a
          free educational platform.
        </p>
        <p className="text-xs text-miro-muted">Last updated: October 2026</p>
      </div>

      <div className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-8 space-y-8 shadow-xs">
        <section className="space-y-3">
          <p className="text-sm text-miro-slate leading-relaxed">
            We are <strong>23p Technologies LLC</strong>, doing business as ArcGym (“
            <strong>Company</strong>,” “<strong>we</strong>,” “<strong>us</strong>,” or “
            <strong>our</strong>”), a company registered in Georgia, United States, at 8735 Dunwoody
            Place, STE R, Atlanta, GA, 30350, USA. We operate the website{' '}
            <a
              href="https://arcgym.com"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              https://arcgym.com
            </a>{' '}
            and related architectural practice software, drills, rubrics, and digital services (the
            “<strong>Services</strong>”). You can contact us by email at{' '}
            <a
              href="mailto:support@23p.tech"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              support@23p.tech
            </a>{' '}
            or by mail at our Atlanta, GA address above.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            These Legal Terms constitute a legally binding agreement between you and 23p
            Technologies LLC concerning your access to and use of the Services. By accessing or
            using the Services, you agree that you have read, understood, and agreed to be bound by
            all of these Legal Terms.{' '}
            <strong>
              IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, YOU ARE EXPRESSLY PROHIBITED FROM
              USING THE SERVICES AND MUST DISCONTINUE USE IMMEDIATELY.
            </strong>
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            We may update these Legal Terms from time to time; we will alert you by updating the
            “Last updated” date above, and your continued use of the Services after that date
            signifies your acceptance of the revised Legal Terms. The Services are intended solely
            for individuals who are at least 18 years old.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            1. Our Services
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            ArcGym delivers daily architectural drills, trade-off analysis scenarios, and incident
            troubleshooting exercises designed to sharpen professional judgment for Salesforce
            architects, technical leads, and enterprise engineers.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            The information provided when using the Services is not intended for distribution to or
            use by any person or entity in any jurisdiction or country where such distribution or
            use would be contrary to law or regulation or which would subject us to any registration
            requirement within such jurisdiction or country. Those who access the Services from
            other locations do so on their own initiative and are solely responsible for compliance
            with local laws.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            The Services are not tailored to comply with industry-specific regulations (such as
            HIPAA, FISMA, or the Gramm-Leach-Bliley Act). If your interactions would be subject to
            such laws, you may not use the Services. ArcGym is an independent educational product
            and is not sponsored, endorsed, or affiliated with Salesforce, Inc.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-3">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            2. Intellectual Property Rights
          </h2>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-miro-primary">Our intellectual property</h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              We are the owner or licensee of all intellectual property rights in our Services,
              including all source code, databases, software, algorithms, designs, text,
              architectural drills, rubrics, scenarios, and graphics (the “Content”), as well as our
              trademarks, service marks, and logos (the “Marks”). Our Content and Marks are
              protected by copyright, trademark, and unfair competition laws. The Content and Marks
              are provided “AS IS” for your personal, non-commercial educational use only.
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            <h3 className="text-sm font-semibold text-miro-primary">Your use of our Services</h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              Subject to your compliance with these Legal Terms, including the “Prohibited
              Activities” section below, we grant you a non-exclusive, non-transferable, revocable
              license to access the Services and to review drill Content solely for your personal,
              non-commercial professional practice.
            </p>
            <p className="text-sm text-miro-slate leading-relaxed">
              Except as explicitly set out here, no part of the Services and no Content or Marks may
              be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed,
              encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited
              for any commercial purpose whatsoever without our express prior written permission. To
              request permission, email{' '}
              <a
                href="mailto:support@23p.tech"
                className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
              >
                support@23p.tech
              </a>
              .
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            <h3 className="text-sm font-semibold text-miro-primary">Your submissions</h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              By sending us any question, comment, suggestion, idea, drill feedback, or other
              information about the Services (“Submissions”), you agree to assign to us all
              intellectual property rights in that Submission. You agree that we shall own all such
              rights and may use and disseminate Submissions for any lawful purpose, commercial or
              otherwise, without acknowledgment, credit, or compensation to you. You warrant that
              your Submissions are original to you and do not infringe the rights of any third
              party.
            </p>
          </div>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            3. User Representations
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            By using the Services, you represent and warrant that: (1) all information you submit
            will be true, accurate, current, and complete; (2) you will maintain the accuracy of
            such information; (3) you have the legal capacity and agree to comply with these Legal
            Terms; (4) you are not a minor in the jurisdiction in which you reside; (5) you will not
            access the Services through automated or non-human means (whether through a bot, script,
            scraper, or otherwise); (6) you will not use the Services for any illegal or
            unauthorized purpose; and (7) your use of the Services will not violate any applicable
            law or regulation.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            If you provide any information that is untrue, inaccurate, not current, or incomplete,
            we have the right to suspend or terminate your session or account and refuse any and all
            current or future use of the Services.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            4. User Registration & Session Management
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You may use ArcGym without creating an account under a local browser session, or you may
            sign in using supported third-party providers (Google or GitHub) to synchronize your
            practice telemetry across devices. You agree to maintain the security of your device and
            connected sessions. We reserve the right to remove, reclaim, or modify any pseudonymous
            identifier or handle if we determine, in our sole discretion, that it is inappropriate,
            obscene, or otherwise objectionable.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            5. Free Service, Plans, and Payment
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            <strong>ArcGym is free to use.</strong> We provide a permanent free tier that includes
            daily architectural drills, rapid-fire judgment sets, case files, incident
            troubleshooting, streak tracking, and cross-device cloud synchronization. We will never
            convert your free access into a paid charge without your explicit, affirmative consent,
            and we do not offer time-limited free trials that automatically convert into recurring
            paid subscriptions.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            If we introduce optional paid plans or premium capabilities in the future, their
            specific features, pricing, and billing periods will be clearly presented before you
            choose to subscribe. Paid offerings will remain optional, and our core practice tier
            remains free.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            6. Prohibited Activities
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You may not access or use the Services for any purpose other than that for which we make
            the Services available. The Services may not be used in connection with any commercial
            endeavors except those that are specifically endorsed or approved by us. As a user of
            the Services, you agree not to:
          </p>
          <ul className="list-disc list-inside text-sm text-miro-slate space-y-1.5 pl-2 leading-relaxed">
            <li>
              Systematically retrieve data, drill scenarios, scoring rubrics, or other content from
              the Services to create or compile, directly or indirectly, a collection, database,
              directory, or training corpus without written permission from us.
            </li>
            <li>
              Trick, defraud, or mislead us and other users, especially in any attempt to learn
              sensitive account identifiers or session tokens.
            </li>
            <li>
              Circumvent, disable, or otherwise interfere with security-related features of the
              Services, including features that prevent or restrict the use or copying of any
              Content or enforce limitations on the use of the Services.
            </li>
            <li>
              Use any information obtained from the Services in order to harass, abuse, or harm
              another person.
            </li>
            <li>
              Make improper use of our support channels or submit false reports of abuse or
              misconduct.
            </li>
            <li>
              Use the Services in a manner inconsistent with any applicable laws or regulations.
            </li>
            <li>Engage in unauthorized framing of or linking to the Services.</li>
            <li>
              Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or
              other material that interferes with any party’s uninterrupted use and enjoyment of the
              Services or modifies, impairs, disrupts, alters, or interferes with the use, features,
              functions, operation, or maintenance of the Services.
            </li>
            <li>
              Engage in any automated use of the system, such as using scripts to submit answers or
              using any data mining, robots, scrapers, or similar data gathering and extraction
              tools.
            </li>
            <li>Delete the copyright or other proprietary rights notice from any Content.</li>
            <li>
              Attempt to impersonate another user or person or use the session of another learner.
            </li>
            <li>
              Interfere with, disrupt, or create an undue burden on the Services or the networks or
              services connected to the Services, including Cloudflare edge workers and D1
              databases.
            </li>
            <li>
              Harass, annoy, intimidate, or threaten any of our employees, contractors, or agents
              engaged in providing any portion of the Services to you.
            </li>
            <li>
              Attempt to bypass any measures of the Services designed to prevent or restrict access
              to the Services, or any portion of the Services.
            </li>
            <li>
              Copy or adapt the Services’ software, including but not limited to Flash, JavaScript,
              or other code.
            </li>
            <li>
              Except as permitted by applicable law, decipher, decompile, disassemble, or reverse
              engineer any of the software comprising or in any way making up a part of the
              Services.
            </li>
            <li>
              Use, launch, develop, or distribute any automated system, including without
              limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses
              the Services.
            </li>
            <li>
              Use the Services as part of any effort to compete with us or otherwise use the
              Services and/or the Content for any revenue-generating endeavor or commercial
              enterprise.
            </li>
          </ul>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            7. User-Generated Contributions & Feedback
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            The Services provide opportunities to rate drills and submit predefined tag feedback
            (e.g., <em>Useful</em>, <em>Good challenge</em>, <em>Unrealistic</em>). We do not
            operate public forums or open comment boards. You represent and warrant that your
            feedback does not violate any intellectual property or proprietary rights, does not
            contain harmful or malicious code, and complies with all applicable laws.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            8. Contribution License
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You agree that we may access, store, process, and use any information and telemetry you
            provide in accordance with the terms of our Privacy Policy. By submitting suggestions,
            tags, or other feedback regarding the Services, you agree that we can use and share such
            feedback for any purpose, including refining drill models and rubrics, without
            compensation or attribution to you.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            9. Third-Party Sign-In & External Links
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You may register or sign in using a third-party account (Google or GitHub). We do not
            collect passwords, names, or emails; authentication relies on standard OAuth 2.0
            redirects and a pseudonymous subject identifier as described in our Privacy Policy. Your
            relationship with third-party identity providers is governed solely by your agreements
            with those providers.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            The Services may link to external websites, including official documentation on{' '}
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              architect.salesforce.com
            </a>
            , Trailhead, and community resources. We assume no responsibility or liability for the
            content, accuracy, privacy practices, or availability of any third-party websites.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            10. Services Management
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            We reserve the right, but not the obligation, to: (1) monitor the Services for
            violations of these Legal Terms; (2) take appropriate legal action against anyone who,
            in our sole discretion, violates the law or these Legal Terms; (3) refuse, restrict
            access to, limit the availability of, or disable (to the extent technologically
            feasible) any of your sessions or practice records; and (4) otherwise manage the
            Services in a manner designed to protect our rights and property and facilitate the
            proper functioning of the Services.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            11. Privacy Policy
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            We care about data privacy and security. Please review our{' '}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline cursor-pointer"
            >
              Privacy Policy
            </a>
            , which is incorporated into these Legal Terms. By using the Services, you agree to be
            bound by our Privacy Policy.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            12. Term and Termination
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            These Legal Terms shall remain in full force and effect while you use the Services.{' '}
            <strong>
              WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN
              OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE
              SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR
              FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION,
              WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR
              REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE ANY
              ASSOCIATED SESSION OR TELEMETRY AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.
            </strong>
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            If we terminate or suspend your access for any reason, you are prohibited from
            registering or practicing under a new session, a borrowed identity, or through automated
            proxies.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            13. Modifications, Interruptions, and Discontinuance of Services
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            <strong>
              We reserve the right to change, modify, update, suspend, discontinue, or remove the
              contents or features of the Services at any time or for any reason at our sole
              discretion without notice.
            </strong>{' '}
            We have no obligation to update any information on our Services. We will not be liable
            to you or any third party for any modification, suspension, downtime, discontinuance, or
            termination of the Services or any portion thereof.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            We cannot guarantee the Services will be available at all times. We may experience
            hardware, software, network, edge routing, or cloud infrastructure problems or need to
            perform routine or emergency maintenance, resulting in interruptions, delays, or errors.{' '}
            <strong>
              You agree that 23p Technologies LLC has no liability whatsoever for any loss, damage,
              or inconvenience caused by your inability to access or use the Services during any
              downtime, interruption, modification, or discontinuance of the Services.
            </strong>{' '}
            Nothing in these Legal Terms will be construed to obligate us to maintain and support
            the Services or to supply any corrections, updates, or releases in connection therewith.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            14. Corrections, Typographical Errors, and Technical Inaccuracies
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            There may be information on the Services that contains typographical errors, technical
            inaccuracies, or omissions, including descriptions, architectural drill scenarios,
            sample code, trade-off rubrics, explanations, answer keys, citations, and platform
            availability. The technical drills, case files, and incident exercises are created for
            educational judgment practice and do not constitute formal architecture certifications,
            guarantees of production outcomes, or professional engineering consulting advice.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            <strong>
              We reserve the right to correct any errors, inaccuracies, or omissions and to change,
              update, or revise the information on the Services at any time, without prior notice.
            </strong>{' '}
            We undertake no obligation to update, amend, or clarify information on the Services
            except as required by law.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            15. Governing Law
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            These Legal Terms and your use of the Services are governed by and construed in
            accordance with the laws of the State of Georgia, United States, applicable to
            agreements made and to be entirely performed within the State of Georgia, without regard
            to its conflict of law principles.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-3">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            16. Dispute Resolution
          </h2>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-miro-primary">Informal negotiations</h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              To expedite resolution and control the cost of any dispute, controversy, or claim
              related to these Legal Terms (“Dispute”), you and 23p Technologies LLC agree to first
              attempt to negotiate any Dispute (except those Disputes expressly provided below)
              informally for at least thirty (30) days before initiating arbitration. Such informal
              negotiations commence upon written notice from one party to the other.
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            <h3 className="text-sm font-semibold text-miro-primary">Binding arbitration</h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              If the parties are unable to resolve a Dispute through informal negotiations, the
              Dispute will be finally and exclusively resolved through binding arbitration. YOU
              UNDERSTAND THAT WITHOUT THIS PROVISION, YOU WOULD HAVE THE RIGHT TO SUE IN COURT AND
              HAVE A JURY TRIAL. The arbitration shall be commenced and conducted under the
              Commercial Arbitration Rules of the American Arbitration Association (“AAA”) and,
              where appropriate, the AAA’s Consumer Arbitration Rules. The arbitration shall take
              place in Fulton County, Georgia. In no event shall any Dispute brought by either party
              be commenced more than one (1) year after the cause of action arose.
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            <h3 className="text-sm font-semibold text-miro-primary">
              Restrictions & class action waiver
            </h3>
            <p className="text-sm text-miro-slate leading-relaxed">
              You and 23p Technologies LLC agree that any arbitration shall be limited to the
              Dispute between the parties individually. TO THE FULL EXTENT PERMITTED BY LAW: (A) NO
              ARBITRATION SHALL BE JOINED WITH ANY OTHER PROCEEDING; (B) THERE IS NO RIGHT OR
              AUTHORITY FOR ANY DISPUTE TO BE ARBITRATED ON A CLASS-ACTION BASIS OR TO UTILIZE CLASS
              ACTION PROCEDURES; AND (C) THERE IS NO RIGHT OR AUTHORITY FOR ANY DISPUTE TO BE
              BROUGHT IN A PURPORTED REPRESENTATIVE CAPACITY ON BEHALF OF THE GENERAL PUBLIC OR ANY
              OTHER PERSONS.
            </p>
          </div>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            17. Disclaimer
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF
            THE SERVICES AND OUR DRILLS WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED
            BY LAW, 23P TECHNOLOGIES LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION
            WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE
            SERVICES’ CONTENT OR THE CONTENT OF ANY WEBSITES LINKED TO THE SERVICES AND WE WILL
            ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF
            CONTENT AND MATERIALS; (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER,
            RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES; (3) ANY UNAUTHORIZED ACCESS TO OR
            USE OF OUR SERVERS, CLOUDFLARE INFRASTRUCTURE, AND/OR ANY TELEMETRY STORED THEREIN; (4)
            ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES; (5) ANY BUGS,
            VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES
            BY ANY THIRD PARTY; AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR
            FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT
            POSTED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            18. Limitations of Liability
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            IN NO EVENT WILL 23P TECHNOLOGIES LLC, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO
            YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL,
            SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR
            OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN,
            OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION,
            WILL AT ALL TIMES BE LIMITED TO THE LESSER OF THE AMOUNT PAID, IF ANY, BY YOU TO US
            DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING OR $50.00 USD.
            CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS ON IMPLIED
            WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO
            YOU, SOME OR ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU, AND YOU
            MAY HAVE ADDITIONAL RIGHTS.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            19. Indemnification
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You agree to defend, indemnify, and hold harmless 23p Technologies LLC, including our
            subsidiaries, affiliates, and all of our respective officers, agents, partners, and
            employees, from and against any loss, damage, liability, claim, or demand, including
            reasonable attorneys’ fees and expenses, made by any third party due to or arising out
            of: (1) your use of the Services; (2) breach of these Legal Terms; (3) any breach of
            your representations and warranties set forth in these Legal Terms; (4) your violation
            of the rights of a third party, including but not limited to intellectual property
            rights; or (5) any overt harmful act toward any other user of the Services with whom you
            connected via the Services. Notwithstanding the foregoing, we reserve the right, at your
            expense, to assume the exclusive defense and control of any matter for which you are
            required to indemnify us, and you agree to cooperate, at your expense, with our defense
            of such claims.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            20. User Data & Practice Telemetry
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            We maintain practice telemetry (such as drill attempt states, streaks, points, and
            calibration ratings) in your browser’s local storage and, for authenticated learners,
            within Cloudflare D1. Although we implement deterministic monotonic synchronization and
            standard edge backups, you are solely responsible for all data that you transmit or that
            relates to any activity you have undertaken using the Services. You agree that 23p
            Technologies LLC shall have no liability to you for any loss, desynchronization, or
            corruption of any such data, and you hereby waive any right of action against us arising
            from any such loss or corruption.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            21. Electronic Communications, Transactions, and Signatures
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            Visiting the Services, sending us emails, and completing online interactions constitute
            electronic communications. You consent to receive communications electronically, and you
            agree that all agreements, notices, disclosures, and other communications we provide to
            you electronically, via email and on the Services, satisfy any legal requirement that
            such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES,
            CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES,
            AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            22. California Users and Residents
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            If any complaint with us is not satisfactorily resolved, you may contact the Complaint
            Assistance Unit of the Division of Consumer Services of the California Department of
            Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, CA
            95834, or by telephone at (800) 952-5210 or (916) 445-1254.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            23. Miscellaneous
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            These Legal Terms and any policies or operating rules posted by us on the Services or in
            respect to the Services constitute the entire agreement and understanding between you
            and us. Our failure to exercise or enforce any right or provision of these Legal Terms
            shall not operate as a waiver of such right or provision. These Legal Terms operate to
            the fullest extent permissible by law. We may assign any or all of our rights and
            obligations to others at any time. We shall not be responsible or liable for any loss,
            damage, delay, or failure to act caused by any cause beyond our reasonable control. If
            any provision or part of a provision of these Legal Terms is determined to be unlawful,
            void, or unenforceable, that provision or part of the provision is deemed severable from
            these Legal Terms and does not affect the validity and enforceability of any remaining
            provisions.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            24. Contact Us
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            In order to resolve a complaint regarding the Services or to receive further information
            regarding use of the Services, please contact us at:
          </p>
          <div className="text-sm text-miro-slate space-y-1 pt-1">
            <p className="font-semibold text-miro-primary">23p Technologies LLC</p>
            <p>8735 Dunwoody Place, STE R</p>
            <p>Atlanta, GA, 30350, USA</p>
            <p>
              Email:{' '}
              <a
                href="mailto:support@23p.tech"
                className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
              >
                support@23p.tech
              </a>
            </p>
          </div>
        </section>
      </div>

      <Footer navigate={navigate} currentPath="/terms" />
    </main>
  );
};

export default TermsPage;
