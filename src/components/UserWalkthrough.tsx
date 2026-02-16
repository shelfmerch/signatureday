// import React, { useState, useEffect, useMemo } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
// import { Button } from '@/components/ui/button';

// export interface Step {
//     targetId: string;
//     title: string;
//     description: string;
// }

// interface UserWalkthroughProps {
//     steps: Step[];
// }

// const UserWalkthrough: React.FC<UserWalkthroughProps> = ({ steps }) => {
//     const [currentStep, setCurrentStep] = useState<number | null>(null);
//     const [rect, setRect] = useState<DOMRect | null>(null);
//     const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

//     // New key for v4 fresh start
//     const STORAGE_KEY = 'has_seen_tour_v4_fresh';

//     // Initial check and auto-start
//     useEffect(() => {
//         const hasSeen = localStorage.getItem(STORAGE_KEY);
//         if (!hasSeen) {
//             const timer = setTimeout(() => {
//                 setCurrentStep(0);
//                 // Force window size update on start
//                 setWindowSize({ width: window.innerWidth, height: window.innerHeight });
//             }, 1500);
//             return () => clearTimeout(timer);
//         }
//     }, []);

//     // Setup window size listener
//     useEffect(() => {
//         const handleResize = () => {
//             setWindowSize({ width: window.innerWidth, height: window.innerHeight });
//         };
//         window.addEventListener('resize', handleResize);
//         // Set initial size
//         handleResize();
//         return () => window.removeEventListener('resize', handleResize);
//     }, []);

//     // Scroll to element and track position
//     useEffect(() => {
//         if (currentStep === null) return;

//         const targetId = steps[currentStep].targetId;
//         const element = document.getElementById(targetId);

//         if (element) {
//             element.scrollIntoView({ behavior: 'smooth', block: 'center' });
//             setRect(element.getBoundingClientRect());
//         }
//     }, [currentStep, steps]);

//     // Continuous position tracking
//     useEffect(() => {
//         if (currentStep === null) return;

//         const updateRect = () => {
//             const element = document.getElementById(steps[currentStep].targetId);
//             if (element) {
//                 setRect(element.getBoundingClientRect());
//             }
//         };

//         window.addEventListener('scroll', updateRect, { passive: true });
//         window.addEventListener('resize', updateRect, { passive: true });
//         const interval = setInterval(updateRect, 100);

//         return () => {
//             window.removeEventListener('scroll', updateRect);
//             window.removeEventListener('resize', updateRect);
//             clearInterval(interval);
//         };
//     }, [currentStep, steps]);

//     const handleNext = () => {
//         if (currentStep !== null && currentStep < steps.length - 1) {
//             setCurrentStep(currentStep + 1);
//         }
//     };

//     const handleBack = () => {
//         if (currentStep !== null && currentStep > 0) {
//             setCurrentStep(currentStep - 1);
//         }
//     };

//     const handleFinish = () => {
//         // Explicitly clear style overrides
//         document.body.style.overflow = '';
//         document.body.style.pointerEvents = '';
//         setCurrentStep(null);
//         localStorage.setItem(STORAGE_KEY, 'true');
//     };

//     // Unmount cleanup
//     useEffect(() => {
//         return () => {
//             document.body.style.overflow = '';
//             document.body.style.pointerEvents = '';
//         };
//     }, []);

//     // Calculate SVG Path for overlay with hole
//     const overlayPath = useMemo(() => {
//         if (!rect || windowSize.width === 0) return '';

//         // Padded rect for the hole
//         const padding = 10;
//         const x = rect.left - padding;
//         const y = rect.top - padding;
//         const w = rect.width + (padding * 2);
//         const h = rect.height + (padding * 2);

//         // Path Definition:
//         // 1. Outer screen rect (clockwise)
//         // 2. Inner hole rect (counter-clockwise or just second shape for evenodd)
//         // Using M...Z M...Z with fill-rule="evenodd" creates the hole.

//         return `
//             M 0 0
//             H ${windowSize.width}
//             V ${windowSize.height}
//             H 0
//             Z
//             M ${x} ${y}
//             H ${x + w}
//             V ${y + h}
//             H ${x}
//             Z
//         `;
//     }, [rect, windowSize]);

//     if (currentStep === null || !rect) return null;

//     const currentStepData = steps[currentStep];

//     const getTooltipStyles = () => {
//         // Safe check for window availability
//         if (typeof window === 'undefined') return {};

//         const styles: React.CSSProperties = {
//             position: 'absolute',
//             left: rect.left + rect.width / 2,
//             top: rect.bottom + 20,
//             transform: 'translateX(-50%)',
//         };

//         if (rect.bottom > window.innerHeight - 250) {
//             styles.top = 'auto';
//             styles.bottom = window.innerHeight - rect.top + 20;
//         }

//         if (window.innerWidth < 640) {
//             styles.left = '50%';
//             styles.transform = 'translateX(-50%)';
//             styles.width = '90vw';
//             styles.maxWidth = '350px';
//         }

//         return styles;
//     };

//     return (
//         <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">

//             {/* SVG Overlay with Interaction Hole */}
//             <svg
//                 className="absolute inset-0 w-full h-full"
//                 style={{ pointerEvents: 'none' }} // SVG wrapper lets events through
//             >
//                 {/* 
//                    The PATH itself has pointer-events: auto. 
//                    Because of fill-rule="evenodd", the "hole" is not painted.
//                    Therefore, clicks on the "hole" pass through the SVG entirely to the button below.
//                    Clicks on the "overlay" (the painted outer part) are captured by this path.
//                 */}
//                 <motion.path
//                     d={overlayPath}
//                     fill="rgba(0, 0, 0, 0.7)"
//                     fillRule="evenodd"
//                     style={{ pointerEvents: 'auto' }}
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1, d: overlayPath }}
//                     transition={{ duration: 0.3, ease: "easeInOut" }}
//                 />

//                 {/* Simple, Elegant Breathing Highlight */}
//                 <motion.rect
//                     initial={false}
//                     animate={{
//                         x: rect.left - 5,
//                         y: rect.top - 5,
//                         width: rect.width + 10,
//                         height: rect.height + 10,
//                     }}
//                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
//                     rx="8"
//                     fill="none"
//                     stroke="#a855f7"
//                     strokeWidth="2.5"
//                     style={{ pointerEvents: 'none', filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))" }}
//                 >
//                     <motion.animate
//                         attributeName="stroke-opacity"
//                         values="0.4;1;0.4"
//                         dur="3s"
//                         repeatCount="indefinite"
//                     />
//                 </motion.rect>
//             </svg>

//             {/* Tooltip Card */}
//             <div style={getTooltipStyles()} className="pointer-events-auto">
//                 <AnimatePresence mode="wait">
//                     <motion.div
//                         key={currentStep}
//                         initial={{ opacity: 0, scale: 0.9, y: 10 }}
//                         animate={{ opacity: 1, scale: 1, y: 0 }}
//                         exit={{ opacity: 0, scale: 0.9, y: 10 }}
//                         transition={{ duration: 0.2 }}
//                         className="bg-white rounded-xl shadow-2xl p-5 w-[300px] md:w-[350px] border border-purple-100"
//                     >
//                         <div className="flex justify-between items-center mb-3">
//                             <div className="flex items-center gap-2 text-purple-600">
//                                 <Lightbulb className="w-5 h-5 fill-purple-100" />
//                                 <span className="text-xs font-bold uppercase tracking-wider">Guide {currentStep + 1}/{steps.length}</span>
//                             </div>
//                             <button onClick={handleFinish} className="text-slate-400 hover:text-slate-600">
//                                 <X className="w-4 h-4" />
//                             </button>
//                         </div>

//                         <h3 className="text-lg font-bold text-slate-900 mb-2">{currentStepData.title}</h3>
//                         <p className="text-sm text-slate-600 mb-6 leading-relaxed">
//                             {currentStepData.description}
//                         </p>

//                         <div className="flex items-center justify-between">
//                             <div className="flex gap-1.5">
//                                 {steps.map((_, i) => (
//                                     <div
//                                         key={i}
//                                         className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-purple-600' : 'w-1.5 bg-slate-200'}`}
//                                     />
//                                 ))}
//                             </div>

//                             <div className="flex gap-2">
//                                 {currentStep > 0 && (
//                                     <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-500 hover:text-slate-700">
//                                         Back
//                                     </Button>
//                                 )}
//                                 <Button
//                                     size="sm"
//                                     onClick={currentStep === steps.length - 1 ? handleFinish : handleNext}
//                                     className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
//                                 >
//                                     {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
//                                     {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
//                                 </Button>
//                             </div>
//                         </div>
//                     </motion.div>
//                 </AnimatePresence>
//             </div>
//         </div>
//     );
// };

// export default UserWalkthrough;

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Step {
    targetId: string;
    title: string;
    description: string;
}

interface UserWalkthroughProps {
    steps: Step[];
    finishLabel?: string;
    onFinish?: () => void;
    onCancel?: () => void;
    forceStart?: boolean;
    storageKey?: string;
    run?: boolean;
}

const UserWalkthrough: React.FC<UserWalkthroughProps> = ({
    steps,
    finishLabel = 'Finish',
    onFinish,
    onCancel,
    forceStart = false,
    storageKey,
    run = true
}) => {
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [hasFinished, setHasFinished] = useState(false);

    // Page-specific storage key
    const STORAGE_KEY = storageKey || `has_seen_tour_${window.location.pathname.replace(/\//g, '_')}`;


    const initializedRef = React.useRef(false);
    const runRef = React.useRef(run);
    const stepsRef = React.useRef(steps);
    const forceStartRef = React.useRef(forceStart);

    // Update refs when props change (but don't trigger re-init)
    React.useEffect(() => {
        runRef.current = run;
        stepsRef.current = steps;
        forceStartRef.current = forceStart;
    });

    // CRITICAL: Initialization logic
    // We want to trigger initialization when 'run' becomes true
    useEffect(() => {
        console.log('>>> [UserWalkthrough] RE-EVALUATING INITIALIZATION - run:', run);
        // Already initialized
        if (initializedRef.current) return;

        // Guard: Not ready to run
        if (!run) {
            return;
        }

        // Guard: Already seen (unless forced)
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (hasSeen && !forceStartRef.current) {
            return;
        }

        const checkElements = () => {
            const allExist = stepsRef.current.every(step => document.getElementById(step.targetId));
            if (allExist && !initializedRef.current) {
                console.log('>>> [UserWalkthrough] ALL ELEMENTS FOUND, INITIALIZING');
                initializedRef.current = true;
                setCurrentStep(0);
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
                return true;
            }
            return false;
        };

        // Immediate check
        if (checkElements()) return;

        // Poll for DOM elements
        const interval = setInterval(() => {
            // Check if we should stop running midway
            if (!runRef.current) {
                clearInterval(interval);
                return;
            }
            if (checkElements()) {
                clearInterval(interval);
            }
        }, 500);

        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            console.warn('[UserWalkthrough] Timeout - elements not found after 15s');
            clearInterval(interval);
        }, 15000);

        return () => {
            clearInterval(interval);
            clearTimeout(safetyTimeout);
        };
    }, [run, STORAGE_KEY]); // Now reactive to 'run' and page changes

    // Setup window size listener
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        // Set initial size
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNext = React.useCallback(() => {
        if (currentStep !== null && currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    }, [currentStep, steps.length]);

    const handleBack = React.useCallback(() => {
        if (currentStep !== null && currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep]);

    const handleFinish = React.useCallback(() => {
        // Explicitly clear style overrides
        document.body.style.pointerEvents = '';
        setHasFinished(true);
        setCurrentStep(null);
        localStorage.setItem(STORAGE_KEY, 'true');
        if (onFinish) onFinish();
    }, [STORAGE_KEY, onFinish]);

    const handleCancel = React.useCallback(() => {
        document.body.style.pointerEvents = '';
        setHasFinished(true);
        setCurrentStep(null);
        localStorage.setItem(STORAGE_KEY, 'true');
        if (onCancel) onCancel();
    }, [STORAGE_KEY, onCancel]);

    const stepsRefForScroll = React.useRef(steps);
    React.useEffect(() => {
        stepsRefForScroll.current = steps;
    }, [steps]);

    // Scroll to element and track position
    useEffect(() => {
        if (currentStep === null) return;

        const targetId = stepsRefForScroll.current[currentStep]?.targetId;
        if (!targetId) return;

        const element = document.getElementById(targetId);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setRect(element.getBoundingClientRect());
        } else {
            console.warn(`[UserWalkthrough] Target ${targetId} not found. Skipping step ${currentStep}.`);
            // Avoid calling state setters directly in effect if it causes excessive re-renders
            // But here we need to skip.
            if (currentStep < stepsRefForScroll.current.length - 1) {
                // Use functional update to avoid dependency on currentStep if we were to remove it, 
                // but we need it here.
                // This path matches the logic in handleNext but auto-triggered.
                setCurrentStep(s => (s !== null ? s + 1 : null));
            } else {
                handleFinish();
            }
        }
    }, [currentStep, handleFinish]); // Removed 'steps' to avoid re-running when steps array reference changes (though it should be memoized in usage)

    // Continuous position tracking
    useEffect(() => {
        if (currentStep === null) return;

        const updateRect = () => {
            const currentSteps = stepsRefForScroll.current;
            if (!currentSteps[currentStep]) return;

            const element = document.getElementById(currentSteps[currentStep].targetId);
            if (element) {
                setRect(element.getBoundingClientRect());
            }
        };

        window.addEventListener('scroll', updateRect, { passive: true });
        window.addEventListener('resize', updateRect, { passive: true });
        const interval = setInterval(updateRect, 100);

        return () => {
            window.removeEventListener('scroll', updateRect);
            window.removeEventListener('resize', updateRect);
            clearInterval(interval);
        };
    }, [currentStep]); // REMOVED 'steps' dependency - totally stable now




    // Unmount cleanup
    useEffect(() => {
        return () => {
            console.log('>>> [UserWalkthrough] COMPONENT UNMOUNTED');
            document.body.style.pointerEvents = '';
        };
    }, []);

    // Calculate SVG Path for overlay with hole
    const overlayPath = useMemo(() => {
        if (!rect || windowSize.width === 0) return '';

        // Padded rect for the hole
        const padding = 10;
        const x = rect.left - padding;
        const y = rect.top - padding;
        const w = rect.width + (padding * 2);
        const h = rect.height + (padding * 2);

        // Path Definition:
        // 1. Outer screen rect (clockwise)
        // 2. Inner hole rect (counter-clockwise or just second shape for evenodd)
        // Using M...Z M...Z with fill-rule="evenodd" creates the hole.

        return `
            M 0 0
            H ${windowSize.width}
            V ${windowSize.height}
            H 0
            Z
            M ${x} ${y}
            H ${x + w}
            V ${y + h}
            H ${x}
            Z
        `;
    }, [rect, windowSize]);

    if (currentStep === null || !rect) return null;

    const currentStepData = steps[currentStep];

    const getTooltipStyles = () => {
        // Safe check for window availability
        if (typeof window === 'undefined') return {};

        const styles: React.CSSProperties = {
            position: 'absolute',
            left: rect.left + rect.width / 2,
            top: rect.bottom + 20,
            transform: 'translateX(-50%)',
        };

        if (rect.bottom > window.innerHeight - 250) {
            styles.top = 'auto';
            styles.bottom = window.innerHeight - rect.top + 20;
        }

        if (window.innerWidth < 640) {
            styles.left = '50%';
            styles.transform = 'translateX(-50%)';
            styles.width = '90vw';
            styles.maxWidth = '350px';
        }

        return styles;
    };

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">

            {/* SVG Overlay with Interaction Hole */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }} // SVG wrapper lets events through
            >
                {/* 
                   The PATH itself has pointer-events: auto. 
                   Because of fill-rule="evenodd", the "hole" is not painted.
                   Therefore, clicks on the "hole" pass through the SVG entirely to the button below.
                   Clicks on the "overlay" (the painted outer part) are captured by this path.
                */}
                <motion.path
                    d={overlayPath}
                    fill="rgba(0, 0, 0, 0.7)"
                    fillRule="evenodd"
                    style={{ pointerEvents: 'auto' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, d: overlayPath }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />

                {/* Simple, Elegant Breathing Highlight */}
                <motion.rect
                    initial={false}
                    animate={{
                        x: rect.left - 5,
                        y: rect.top - 5,
                        width: rect.width + 10,
                        height: rect.height + 10,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    rx="8"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeOpacity={0.7}
                    style={{ pointerEvents: 'none', filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))" }}
                />
            </svg>

            {/* Tooltip Card */}
            <div style={getTooltipStyles()} className="pointer-events-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-xl shadow-2xl p-5 w-[300px] md:w-[350px] border border-purple-100"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-purple-600">
                                <Lightbulb className="w-5 h-5 fill-purple-100" />
                                <span className="text-xs font-bold uppercase tracking-wider">Guide {currentStep + 1}/{steps.length}</span>
                            </div>
                            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2">{currentStepData.title}</h3>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            {currentStepData.description}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-purple-600' : 'w-1.5 bg-slate-200'}`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-500 hover:text-slate-700">
                                        Back
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={currentStep === steps.length - 1 ? handleFinish : handleNext}
                                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
                                >
                                    {currentStep === steps.length - 1 ? finishLabel : 'Next'}
                                    {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}


export default React.memo(UserWalkthrough);