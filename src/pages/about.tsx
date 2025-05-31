import DefaultLayout from "@/layouts/default";

export default function DocsPage() {
  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-12">
        
        {/* Introduction Card */}
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold border-b pb-2 mb-4">What is this app?</h2>
          <div className="prose max-w-none">
            <p>
              The booster pack generator app creates random card selections that can be used to assemble 
              complete booster packs for the Oakland Zoo Trading Card program.
            </p>
            <div className="mt-4 bg-muted/50 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-2">How to access:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Visit <a href="https://ozboosterpacks.albertshih.org/" className="text-primary hover:underline font-medium">
                  ozboosterpacks.albertshih.org
                </a></li>
                <li>Scan the QR code on the ZooCamp/TWG HQ whiteboard</li>
                <li>Scan the QR code on the On-Grounds Corkboard (by desks)</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* How To Use Card */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 text-primary mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h2 className="text-xl font-bold">Quick Start Guide</h2>
            </div>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Navigate to the website</li>
              <li>Press "Generate Booster Pack!" on the top left corner</li>
              <li>Pull the cards specified from Mint card box to make your booster pack</li>
              <li>Check off cards as you create the pack</li>
              <li>Repeat as desired</li>
            </ol>
          </div>
          
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 text-primary mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <h2 className="text-xl font-bold">Multiple Packs</h2>
            </div>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Navigate to the website</li>
              <li>Select from 5, 10, or 20 booster packs</li>
              <li>Expand or close each pack as necessary</li>
              <li>Pull the cards specified from Mint card box</li>
              <li>Check off cards as you create each pack</li>
            </ol>
          </div>
        </div>
        
        {/* Admin Section */}
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold">Editing Card Information</h2>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="font-bold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              IMPORTANT: Please only edit cards if you have explicit permission from Patrick Wolff or an On-Grounds supervisor.
            </p>
            <p className="mt-1 text-sm italic">(my trust was broken and now you also need an account :|)</p>
          </div>
          
          <div className="space-y-3">
            <p>
              <span className="font-medium">Access:</span> Click the "Edit" button in the top right of the screen. You will need to log in.
              Email <a href="mailto:ashih@oaklandzoo.org" className="text-primary hover:underline">ashih@oaklandzoo.org</a> for access.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Managing Cards</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Toggle cards Active/Inactive (Active cards show up in the generator)</li>
                  <li>Edit card information (name, number, active status)</li>
                  <li>Delete cards (use only if approved by Patrick)</li>
                </ul>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Adding Cards</h3>
                <p className="mb-2">Click the blue plus button to add a card. You'll need:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Card name</li>
                  <li>Card number</li>
                  <li>Zoo section (Australia cards are labeled as "Special Editions")</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Help Section */}
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold border-b pb-2 mb-4">Need Help?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/30 p-4 rounded-md">
              <h3 className="font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                App Support
              </h3>
              <p className="mt-2">
                For questions about using the app or to report bugs, contact:
              </p>
              <p className="mt-1 font-medium">
                Albert Shih<br />
                <a href="mailto:ashih@oaklandzoo.org" className="text-primary hover:underline">ashih@oaklandzoo.org</a>
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-md">
              <h3 className="font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M17 6.1H3"></path>
                  <path d="M21 12.1H3"></path>
                  <path d="M15.1 18H3"></path>
                </svg>
                Program Information
              </h3>
              <p className="mt-2">
                For questions about the Trading Card program or booster packs, contact:
              </p>
              <p className="mt-1 font-medium">
                Patrick Wolff<br />
                <a href="mailto:pwolff@oaklandzoo.org" className="text-primary hover:underline">pwolff@oaklandzoo.org</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
