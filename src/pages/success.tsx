import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams, Link } from 'react-router-dom';
import { Home, Users, Mail, ArrowRight, Share } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCollage } from '@/context/CollageContext';
import { toast } from 'sonner';

// Subtle animated background consistent with GridBoard/Dashboard
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-400/10 to-yellow-400/10 animate-gradient-xy" />
    <div className="absolute inset-0 backdrop-blur-3xl" />
  </div>
);

// Celebration particles
const CelebrationParticle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
    initial={{ opacity: 0, scale: 0, y: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0.5],
      y: [0, -100],
      x: [0, Math.random() * 100 - 50],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

const Success = () => {
  const [searchParams] = useSearchParams();
  const { getGroup } = useCollage();
  const groupId = searchParams.get('groupId');
  
  const [group, setGroup] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (groupId) {
      // Try to load group information if groupId is available
      const loadGroup = async () => {
        try {
          const foundGroup = await getGroup(groupId, true); // Force refresh
          if (foundGroup) {
            setGroup(foundGroup);
          }
        } catch (error) {
          console.error('Failed to load group:', error);
        }
      };
      loadGroup();
    }
  }, [groupId, getGroup]);

  const shareLink = group?.id ? `${window.location.origin}/join/${group.id}` : (groupId ? `${window.location.origin}/join/${groupId}` : '');

  const handleShare = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Share link copied to clipboard!');
    } else {
      toast.error('Group link not available');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 animate-fadeIn">
      <AnimatedBackground />
      
      {/* Celebration particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <CelebrationParticle key={i} delay={i * 0.1} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
         
        <Card className="shadow-2xl border-0 backdrop-blur-lg bg-white/90">

            <CardContent className="space-y-6">
            {/* Celebration GIF */}
              <div className="w-full max-w-[700px] mx-auto">
                <div className="w-full h-auto p-1 bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 shadow-xl rounded-lg">
                  <img 
                    src="/success.png" 
                    alt="Celebration" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200"
            >
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                What's Next?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Share the group link with your friends to invite them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Wait for all members to join and upload their photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Once complete, proceed to checkout to place your order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>You'll receive an email confirmation shortly</span>
                </li>
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 pt-4"
            >
              <Link to="/" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                    Back to Home 
                  </Button>
              </Link>
              <Button 
                variant="outline" 
                className="flex-1 w-full" 
                size="lg" 
                onClick={() => setIsShareModalOpen(true)}
              >
              <Users className="w-4 h-4 mr-2" />
                Share with friends
              </Button>
            </motion.div>

            {/* Support Information */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="pt-4 border-t border-gray-200"
            >
              <p className="text-xs text-center text-gray-500">
                Need help? Contact us at{' '}
                <a href="mailto:support@signatureday.com" className="text-purple-600 hover:underline flex items-center justify-center gap-1 inline-flex">
                  <Mail className="w-3 h-3" />
                  support@signatureday.com
                </a>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto bg-white backdrop-blur-lg border-none shadow-xl p-4 sm:p-6 rounded-xl">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
              Share with Your Class
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-600">
              Invite your classmates to join the group and contribute their photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Invite Link Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm sm:text-base font-medium text-gray-900">Invite Link</h3>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg space-y-3">
                <div className="relative">
                  <code className="text-xs sm:text-sm bg-white p-2 sm:p-3 rounded block break-all border border-purple-100">
                    {shareLink || 'Group link not available'}
                  </code>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white pointer-events-none" />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleShare}
                  className="w-full bg-white hover:bg-purple-50 border-purple-200 text-purple-700 h-9 sm:h-10 text-sm"
                  disabled={!shareLink}
                >
                  <Share className="h-4 w-4 mr-2" /> Copy Link
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Success;