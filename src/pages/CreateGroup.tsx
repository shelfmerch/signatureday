import { useState, useRef, Suspense, lazy, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Calendar, Hash, Layout, Type, Sparkles, Camera, Rocket, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCollage, GridTemplate } from "@/context/CollageContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { GridPreview } from "@/components/GridPreview";
import ImageUpload from "@/components/ImageUpload";
import { GridProvider } from "@/components/square/context/GridContext";
import "./grid.css";
import UserWalkthrough from "@/components/UserWalkthrough";

// Animated background gradient
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-yellow-400/30 animate-gradient-xy" />
    <div className="absolute inset-0 bg-[url('/patterns/circuit-board.svg')] opacity-5" />
    <div className="absolute inset-0 backdrop-blur-3xl" />
  </div>
);

// Available square template numbers (all available templates from 34 to 128)
const AVAILABLE_SQUARE_TEMPLATES = Array.from({ length: 95 }, (_, i) => i + 34);

// Helper function to select the correct template number
const getSquareTemplateNumber = (memberCount: number): number => {
  if (AVAILABLE_SQUARE_TEMPLATES.includes(memberCount)) {
    return memberCount;
  }
  // Find the closest available template number
  const closest = AVAILABLE_SQUARE_TEMPLATES.reduce((prev, curr) => {
    return Math.abs(curr - memberCount) < Math.abs(prev - memberCount) ? curr : prev;
  });
  return closest;
};

interface CellImage {
  [key: string]: string;
}



const CreateGroup = () => {
  const [cellImages, setCellImages] = useState<CellImage>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState<string>("");
  const [PreviewComp, setPreviewComp] = useState<React.LazyExoticComponent<React.ComponentType> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Add responsive breakpoint check for desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setIsDesktop(matches);
    };
    setIsDesktop(mq.matches);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Add event listener for grid template download
  useEffect(() => {
    const handleDownload = () => {
      console.log('Download requested');
      // Handle download if needed
    };

    window.addEventListener('grid-template-download', handleDownload);
    return () => window.removeEventListener('grid-template-download', handleDownload);
  }, []);

  // Map of all TSX components in this folder
  const componentModules = import.meta.glob('@/components/square/[0-9]*.tsx', { eager: true });

  const [formData, setFormData] = useState({
    name: "",
    yearOfPassing: "",
    totalMembers: "",
    gridTemplate: "square" as GridTemplate,
    logoFile: null as File | null,
    logoPreview: "",
    customText: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createGroup, isLoading } = useCollage();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Show loading state while context is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
            <p className="text-gray-600">Initializing application...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImageChange = (file: File | null, preview: string) => {
    setFormData(prev => ({
      ...prev,
      logoFile: file,
      logoPreview: preview
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const membersNum = parseInt(formData.totalMembers);

    // Validate squad size limits
    if (membersNum < 8) {
      toast.error("Add 10 more people to make your team complete");
      return;
    }

    if (membersNum > 97) {
      toast.error("Oops, your team is too big to fit in a single tshirt. Reduce 3 more people. To make collage");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for active referral
      const { AmbassadorStorageService } = await import('@/lib/ambassadorStorage');
      const referralCode = AmbassadorStorageService.getActiveReferral();

      const groupId = await createGroup({
        name: formData.name,
        yearOfPassing: formData.yearOfPassing,
        totalMembers: membersNum,
        gridTemplate: formData.gridTemplate
      });

      if (!groupId) {
        throw new Error('Failed to create group');
      }

      // If there's a referral, store it with the group
      if (referralCode) {
        const ambassador = AmbassadorStorageService.getAmbassadorByReferralCode(referralCode);
        if (ambassador) {
          localStorage.setItem(`group-${groupId}-ambassador`, ambassador.id);
          AmbassadorStorageService.clearActiveReferral();
        }
      }

      // Update user data to mark as leader and set groupId
      if (user) {
        await updateUser({
          isLeader: true,
          groupId
        });
      }

      toast.success("Group created successfully!");
      // Set flag to show dashboard tour
      sessionStorage.setItem('showDashboardTour', 'true');
      navigate(`/dashboard/${groupId}`);
    } catch (error) {
      toast.error("Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadComponentByNumber = async (n: number) => {
    setLoadError(null);
    setPreviewComp(null);

    console.log('Loading component number:', n);
    console.log('Available modules:', Object.keys(componentModules));

    if (!/^[0-9]+$/.test(String(n))) {
      setLoadError('Please enter a valid number.');
      return;
    }

    const matchingPath = Object.keys(componentModules).find(p => p.includes(`/${n}.tsx`));
    console.log('Found matching path:', matchingPath);

    if (matchingPath) {
      try {
        const module = componentModules[matchingPath] as { default: React.ComponentType<any> };
        const LazyComp = lazy(() => Promise.resolve(module));
        console.log('Component loaded successfully');
        setPreviewComp(() => LazyComp);
      } catch (error) {
        console.error('Error loading component:', error);
        setLoadError(`Error loading component ${n}.tsx`);
      }
    } else {
      console.warn(`Component ${n}.tsx not found in available modules`);
      console.log(`Template ${n} will be available soon.`);
    }
  };

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(numberInput);
    if (Number.isNaN(n)) {
      setLoadError('Enter a valid number.');
      return;
    }
    loadComponentByNumber(n);
  };

  const isValidForm = formData.name && formData.yearOfPassing && formData.totalMembers && parseInt(formData.totalMembers) > 0;

  return (
    <div className="min-h-screen max-w-8xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 relative">
      <AnimatedBackground />

      {/* Floating Decorative Elements */}
      <motion.div
        className="absolute top-10 right-10 text-purple-500 opacity-50"
        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Sparkles className="w-8 h-8" />
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-10 text-pink-500 opacity-50"
        animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      >
        <Heart className="w-6 h-6" />
      </motion.div>
      <motion.div
        className="absolute top-1/3 left-5 text-yellow-500 opacity-50"
        animate={{ x: [0, 10, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <Rocket className="w-7 h-7" />
      </motion.div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 text-center mb-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text mb-2">
            Create Your Squad! 🚀
          </h1>
          <p className="text-slate-600 text-lg md:text-xl">
            Design your perfect group photo layout and make memories together!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="w-full md:max-w-2xl lg:max-w-xl lg:h-[75vh] backdrop-blur-lg bg-white/80 border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Squad Details
              </CardTitle>
              <CardDescription>
                Fill in your group's info and watch the magic happen! ✨
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreviewSubmit} className="grid grid-cols-1 gap-6">

                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="groupName" className="flex items-center text-base font-medium text-gray-700">
                    <Users className="mr-2 h-5 w-5 text-purple-500" />
                    Squad Name
                  </Label>
                  <Input
                    id="guide-squad-name"
                    placeholder="e.g., CS Warriors 2024 🎓"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-white/50 backdrop-blur-sm border-purple-100 focus:border-purple-300 focus:ring-purple-200 transition-all duration-300"
                  />
                </motion.div>

                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label htmlFor="yearOfPassing" className="flex items-center text-base font-medium text-gray-700">
                    <Calendar className="mr-2 h-5 w-5 text-pink-500" />
                    Graduation Year
                  </Label>
                  <Input
                    id="guide-grad-year"
                    placeholder="When are you graduating? 🎉"
                    value={formData.yearOfPassing}
                    onChange={(e) => setFormData({ ...formData, yearOfPassing: e.target.value })}
                    required
                    className="w-full bg-white/50 backdrop-blur-sm border-pink-100 focus:border-pink-300 focus:ring-pink-200 transition-all duration-300"
                  />
                </motion.div>

                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Label htmlFor="totalMembers" className="flex items-center text-base font-medium text-gray-700">
                    <Users className="mr-2 h-5 w-5 text-yellow-500" />
                    Squad Size
                  </Label>
                  <Input
                    id="guide-squad-size"
                    type="number"
                    inputMode="numeric"
                    value={formData.totalMembers}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, totalMembers: value });
                      if (value && !isNaN(parseInt(value))) {
                        loadComponentByNumber(getSquareTemplateNumber(parseInt(value)));
                      }
                    }}
                    placeholder="How many members in your squad? 👥"
                    required
                    className="w-full bg-white/50 backdrop-blur-sm border-yellow-100 focus:border-yellow-300 focus:ring-yellow-200 transition-all duration-300"
                  />
                </motion.div>

                {/* Logo Upload */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Label className="flex items-center text-base font-medium text-gray-700">
                    <Camera className="mr-2 h-5 w-5 text-purple-500" />
                    Squad Logo
                  </Label>
                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-purple-100">
                    <ImageUpload
                      onImageChange={handleImageChange}
                      currentPreview={formData.logoPreview}
                      label="Drop your logo here! ✨ (Optional)"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    id="guide-launch-btn"
                    type="submit"
                    className={`w-full py-4 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${!isValidForm || isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 hover:from-purple-700 hover:via-pink-700 hover:to-yellow-700"
                      }`}
                    disabled={!isValidForm || isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin mr-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                        Creating Your Squad...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Rocket className="mr-2 h-5 w-5" />
                        Launch Squad! 🚀
                      </div>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Area */}
        <motion.div
          className="w-full lg:max-w-3xl mt-4 lg:mt-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {PreviewComp ? (
            <Card className="w-full backdrop-blur-lg bg-white/80 border-none shadow-xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                    Squad Preview ✨
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => window.dispatchEvent(new Event('grid-template-download'))}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
                  >
                    <motion.div
                      className="flex items-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Download Layout
                    </motion.div>
                  </Button>
                </div>
                <CardDescription>
                  Your squad's photo layout will look something like this! 📸
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Suspense
                    fallback={
                      <div className="p-8 text-center">
                        <div className="animate-spin mx-auto mb-4">
                          <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                        <p className="text-purple-600 font-medium">Creating your squad's layout...</p>
                      </div>
                    }
                  >
                    <GridProvider>
                      <PreviewComp />
                    </GridProvider>
                  </Suspense>
                </motion.div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full backdrop-blur-lg bg-white/80 border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                  Squad Preview ✨
                </CardTitle>
                <CardDescription>
                  Your masterpiece will appear here!
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.02, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-gray-600">
                    Enter your squad size to see the magic happen! ✨
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          )}
        </motion.div>

      </div>

      {user && !user.guidesSeen?.createGroup && (
        <UserWalkthrough
          steps={[
            {
              targetId: "guide-squad-name",
              title: "Name Your Squad",
              description: "Give your group a catchy name! e.g. 'Class of 2024' or 'The Avengers'."
            },
            {
              targetId: "guide-grad-year",
              title: "Graduation Year",
              description: "When are you graduating? This helps in customizing your batch details."
            },
            {
              targetId: "guide-squad-size",
              title: "Squad Size",
              description: "Enter the number of members. We'll automatically suggest the best grid layout for you!"
            },
            {
              targetId: "guide-launch-btn",
              title: "Launch Squad",
              description: "Click here to create your group and start inviting friends!"
            }
          ]}
          storageKey={`create_group_guide_${user.id}_v1`}
          onFinish={async () => {
            if (user) {
              await updateUser({
                guidesSeen: {
                  ...user.guidesSeen,
                  dashboard: user.guidesSeen?.dashboard || false,
                  editor: user.guidesSeen?.editor || false,
                  home: user.guidesSeen?.home || false,
                  createGroup: true
                }
              });
            }
          }}
          forceStart={true}
        />
      )}
    </div>
  );
};

export default CreateGroup;