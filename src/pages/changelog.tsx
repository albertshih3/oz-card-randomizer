import DefaultLayout from "@/layouts/default";

export default function Changelog() {
  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-12">
        
        <div className="max-w-3xl mx-auto">
          {/* Timeline container */}
          <div className="relative border-l-2 border-primary/30 pl-8 ml-6 pb-6 space-y-10">
            
            {/* Version 1.1 */}
            <div className="relative">
              {/* Timeline node */}
              <div className="absolute -left-[53px] flex items-center justify-center w-10 h-10 rounded-full bg-primary text-background shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              
              {/* Content */}
              <div className="bg-card rounded-lg shadow-md p-6">
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Version 1.1</h2>
                  <div className="flex items-center">
                    <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Current
                    </span>
                    <span className="ml-3 text-sm text-muted-foreground">May 5, 2025</span>
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Feature Enhancements
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Added detailed usage information to the usage (about) page</li>
                      <li>Implemented interactive timeline-based Changelog page</li>
                      <li>Improved information architecture for better user guidance</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Bug Fixes
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Fixed Excel sheet generation issue</li>
                      <li>Restored Vercel analytics for better usage tracking</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Minor Changes
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Updated contact information with Oakland Zoo emails</li>
                      <li>Added tooltip explanations for key features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Version 1.0 */}
            <div className="relative">
              {/* Timeline node */}
              <div className="absolute -left-[53px] flex items-center justify-center w-10 h-10 rounded-full bg-primary/80 text-background shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              
              {/* Content */}
              <div className="bg-card rounded-lg shadow-md p-6">
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Version 1.0</h2>
                  <span className="text-sm text-muted-foreground">Febuary 2nd, 2025</span>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Major Website Revamp
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Complete UI redesign with modern card-based interface</li>
                      <li>New theme system with light/dark mode support</li>
                      <li>Responsive layout for better mobile experience</li>
                      <li>Improved navigation and user accessibility</li>
                      <li>Enhanced card editing interface for administrators</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      New Features
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Multi-pack generation (5, 10, 20 packs at once)</li>
                      <li>Collapsible pack cards for better organization</li>
                      <li>Card checkoff system to track pack assembly progress</li>
                      <li>Added Active/Inactive toggle to edit card page</li>
                      <li>User authentication system for card editors</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Technical Improvements
                    </h3>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      <li>Framework update to latest version</li>
                      <li>Performance optimizations for faster load times</li>
                      <li>Improved code structure and maintainability</li>
                      <li>Added analytics for usage tracking</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Initial Release - for historical completeness */}
            <div className="relative">
              {/* Timeline node */}
              <div className="absolute -left-[53px] flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 8v4"></path>
                  <path d="M12 16h.01"></path>
                </svg>
              </div>
              
              {/* Content */}
              <div className="bg-card rounded-lg shadow-md p-6">
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Initial Release</h2>
                  <span className="text-sm text-muted-foreground"></span>
                </div>
                
                <p className="text-muted-foreground italic">
                  First version of the Oakland Zoo Booster Pack Generator launched with basic functionality 
                  for random card generation and simple management interface.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}