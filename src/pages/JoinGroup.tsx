import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Users, Calendar, Vote, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import PhoneOtpWidgetIndia from "@/components/otp/PhoneOtpWidgetIndia";
import { useJoinGroup } from "@/hooks/useJoinGroup";
import { useAuth } from "@/context/AuthContext";
import { getAvailableTemplates, getInitialTemplateIndex } from "@/lib/templateUtils";

// Subtle animated background to match GridBoard/Dashboard look
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-400/10 to-yellow-400/10 animate-gradient-xy" />
    <div className="absolute inset-0 backdrop-blur-3xl" />
  </div>
);

// Fix the import to use named export
const GridPreview = lazy(() =>
  import("@/components/GridPreview").then(module => ({
    default: module.GridPreview
  }))
);

const JoinGroup = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const isLeader = user?.isLeader ?? false;
  const {
    memberData,
    errors,
    group,
    previewTemplate,
    isSubmitting,
    loadingGroup,
    isLoading,
    formTouched,
    handleInputChange,
    handlePhotoUpload,
    handleSubmit,
    submitPhotoUrl,
    isUploadingPhoto,
    isProcessingPayment,
    isPhoneVerified,
    onPhoneVerified,
    joinPricing
  } = useJoinGroup(groupId);

  // Template switching hooks MUST run before any early returns (Rules of Hooks)
  const totalMembersForTemplates = group?.totalMembers ?? 0;
  const gridTemplateForTemplates = group?.gridTemplate ?? 'square';
  const availableTemplates = React.useMemo(
    () => getAvailableTemplates(totalMembersForTemplates),
    [totalMembersForTemplates]
  );
  const [currentTemplateIndex, setCurrentTemplateIndex] = React.useState(0);
  React.useEffect(() => {
    setCurrentTemplateIndex((prev) => {
      if (prev >= availableTemplates.length) {
        return getInitialTemplateIndex(availableTemplates, gridTemplateForTemplates);
      }
      return prev;
    });
  }, [availableTemplates, gridTemplateForTemplates]);
  const displayTemplate = availableTemplates[Math.min(currentTemplateIndex, Math.max(0, availableTemplates.length - 1))]?.type ?? gridTemplateForTemplates;
  const handlePrevTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (availableTemplates.length <= 1) return;
    setCurrentTemplateIndex((i) => (i - 1 + availableTemplates.length) % availableTemplates.length);
  };
  const handleNextTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (availableTemplates.length <= 1) return;
    setCurrentTemplateIndex((i) => (i + 1) % availableTemplates.length);
  };

  // Show loading state while context is initializing or group is loading
  if (isLoading || loadingGroup) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 animate-fadeIn">
        <AnimatedBackground />
        {isSubmitting ? <div className="mb-6">
          <div className="mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
            <img src="/congrats.gif" alt="success" width={400} />
          </div>
        </div>
          :
          <Card className="w-full max-w-md text-center animate-slideUp backdrop-blur-lg bg-white/80 border-none shadow-xl">
            <CardContent className="pt-6">
              <div className="w-12 h-12 border-4 border-t-purple-600 border-purple-200 rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4 animate-pulse">Loading...</h1>
              <p className="text-gray-600">{loadingGroup ? "Loading group data..." : "Initializing application..."}</p>
            </CardContent>
          </Card>
        }
      </div>
    );
  }





  if (!group) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <AnimatedBackground />
        <Card className="w-full max-w-md text-center backdrop-blur-lg bg-white/80 border-none shadow-xl">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
            <p className="text-gray-600 mb-6">The group you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGroupFull = group.members.length >= group.totalMembers;
  const remainingSpots = group.totalMembers - group.members.length;
  const isCloudinaryPhoto = typeof memberData.photo === 'string' && memberData.photo.includes('/image/upload');

  return (
    <div className="min-h-screen w-full mx-auto p-3 sm:p-4 md:p-6 relative animate-fadeIn" key="main-container">
      <AnimatedBackground />
      <div className="container mx-auto max-w-6xl animate-slideUp opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }} key="content-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8 space-y-3 sm:space-y-0" key="header">
          {/* Hide Back to Home for leaders - they should complete joining first */}
          {!isLeader && (
            <Link to="/" key="back-link">
              <Button variant="ghost" size="sm" className="mr-0 sm:mr-4 w-fit text-gray-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          )}
          <div key="group-info">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-transparent bg-clip-text">{group.name}</h1>
            <p className="text-sm sm:text-base text-gray-600">Class of {group.yearOfPassing}</p>
          </div>
        </div>

        {/* Group Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8" key="group-info-cards">
          <Card className="text-center" key="members-card">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{group.members.length}/{group.totalMembers}</p>
              <p className="text-xs sm:text-sm text-gray-600">Members Joined</p>
            </CardContent>
          </Card>
          <Card className="text-center" key="year-card">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-pink-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{group.yearOfPassing}</p>
              <p className="text-xs sm:text-sm text-gray-600">Graduation Year</p>
            </CardContent>
          </Card>
          <Card className="text-center" key="template-card">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <Vote className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold capitalize">{group.gridTemplate}</p>
              <p className="text-xs sm:text-sm text-gray-600">
                {group.layoutMode === 'voting' ? 'Current Winner' : 'Layout (locked)'}
              </p>
            </CardContent>
          </Card>
        </div>

        {isGroupFull ? (
          <Card className="text-center shadow-xl border-0 backdrop-blur-lg bg-white/80">
            <CardContent className="pt-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Group is Full!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">This group has reached its maximum capacity.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-4 lg:space-y-6 order-1">

              {/* Join Form */}
              <Card className="shadow-xl border-0 backdrop-blur-lg bg-white/80">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Join the Group</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {group.layoutMode === 'voting'
                      ? `Upload your photo and vote for your favorite grid template. ${remainingSpots} spots remaining!`
                      : `Upload your photo to join the group. ${remainingSpots} spots remaining!`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <PhoneOtpWidgetIndia
                      purpose="joinGroup"
                      onVerified={(phone10) => onPhoneVerified('+91' + phone10)}
                      className="bg-slate-50/70"
                      disabled={isSubmitting || isProcessingPayment}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="memberName" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <span className="text-sm sm:text-base font-medium">Your Name</span>
                        {errors.name && <span className="text-xs text-red-500 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{errors.name}</span>}
                        {formTouched && memberData.name && !errors.name && <span className="text-xs text-green-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Valid</span>}
                      </Label>
                      <Input
                        id="memberName"
                        placeholder="Enter your full name"
                        value={memberData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400 ${errors.name ? "border-red-300 focus:border-red-500" : ""}`}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memberEmail" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <span className="text-sm sm:text-base font-medium">Your Email</span>
                        {errors.email && <span className="text-xs text-red-500 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{errors.email}</span>}
                      </Label>
                      {user?.id === group?.leaderId && memberData.email && user?.email && memberData.email.toLowerCase() !== user.email.toLowerCase() && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1 animate-fadeIn bg-amber-100/30 px-2 py-1.5 rounded-md border border-amber-200 flex items-start">
                          <AlertCircle className="w-3 h-3 mr-2 mt-0.5 shrink-0" />
                          <span>
                            <strong>Note for Leader:</strong> Please use your <strong>registered account email</strong> to ensure you are correctly redirected to your Dashboard after joining.
                          </span>
                        </p>
                      )}
                      {formTouched && memberData.email && !errors.email && <span className="text-xs text-green-500 flex items-center mt-1"><CheckCircle className="w-3 h-3 mr-1" />Valid</span>}
                      <Input
                        id="memberEmail"
                        placeholder="Enter your email"
                        value={memberData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400 ${errors.email ? "border-red-300 focus:border-red-500" : ""}`}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memberRollNumber" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <span className="text-sm sm:text-base font-medium">Roll No.</span>
                        {errors.memberRollNumber && <span className="text-xs text-red-500 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{errors.memberRollNumber}</span>}
                        {formTouched && memberData.memberRollNumber && !errors.memberRollNumber && <span className="text-xs text-green-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Valid</span>}
                      </Label>
                      <Input
                        id="memberRollNumber"
                        placeholder="Enter your roll number"
                        value={memberData.memberRollNumber}
                        onChange={(e) => handleInputChange('memberRollNumber', e.target.value)}
                        className={`border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400 ${errors.memberRollNumber ? "border-red-300 focus:border-red-500" : ""}`}
                        aria-invalid={!!errors.memberRollNumber}
                        aria-describedby={errors.memberRollNumber ? "roll-error" : undefined}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="size" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <span className="text-sm sm:text-base font-medium">T‑Shirt Size</span>
                        {errors.size && <span className="text-xs text-red-500 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{errors.size}</span>}
                        {formTouched && memberData.size && !errors.size && <span className="text-xs text-green-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Selected</span>}
                      </Label>
                      <Select
                        value={memberData.size}
                        onValueChange={(val) => handleInputChange('size', val as 's' | 'm' | 'l' | 'xl' | 'xxl')}
                      >
                        <SelectTrigger id="size" className={`border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400 ${errors.size ? "border-red-300" : ""}`}>
                          <SelectValue placeholder="Select your size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="size-s" value="s">S</SelectItem>
                          <SelectItem key="size-m" value="m">M</SelectItem>
                          <SelectItem key="size-l" value="l">L</SelectItem>
                          <SelectItem key="size-xl" value="xl">XL</SelectItem>
                          <SelectItem key="size-xxl" value="xxl">XXL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Layout: only show vote selection when leader chose Voting; otherwise show locked layout */}
                    <div className="space-y-2">
                      {group.layoutMode === 'voting' ? (
                        <>
                          <Label htmlFor="layout-vote" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                            <span className="text-sm sm:text-base font-medium">Choose Layout</span>
                          </Label>
                          <Select
                            value={memberData.vote}
                            onValueChange={(val) => handleInputChange('vote', val as 'square' | 'hexagonal' | 'any')}
                            required
                          >
                            <SelectTrigger id="layout-vote" className="border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400">
                              <SelectValue placeholder="Square, Hexagon, or Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="hexagonal">Hexagon</SelectItem>
                              <SelectItem value="any">Any (I'm flexible)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">Your vote helps decide the final grid layout.</p>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-sm sm:text-base font-medium">Layout</span>
                          <p className="text-sm text-gray-600">
                            {group.gridTemplate === 'hexagonal' ? 'Hexagon' : 'Square'} (locked by leader)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photo" className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <span className="flex items-center text-sm sm:text-base font-medium">
                          <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Upload Your Photo
                        </span>
                        {errors.photo && <span className="text-xs text-red-500 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{errors.photo}</span>}
                        {formTouched && memberData.photo && !errors.photo && <span className="text-xs text-green-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Uploaded</span>}
                      </Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className={`border-purple-200 focus:ring-0 focus:ring-offset-0 focus:border-purple-400 file:bg-purple-50 file:text-purple-700 file:border-0 ${errors.photo ? "border-red-300 focus:border-red-500" : ""}`}
                        aria-invalid={!!errors.photo}
                      />

                      {/* Zoom Slider - appears after photo is uploaded */}
                      {memberData.photo && memberData.photo.includes('/image/upload') && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Zoom Level</Label>
                            <span className="text-xs text-gray-500">{memberData.zoomLevel.toFixed(1)}x</span>
                          </div>
                          <Slider
                            value={[memberData.zoomLevel]}
                            onValueChange={(value) => handleInputChange('zoomLevel', value[0])}
                            min={0.1}
                            max={2.0}
                            step={0.1}
                            disabled={isUploadingPhoto || isSubmitting}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Zoom out</span>
                            <span>Zoom in</span>
                          </div>

                          {/* Live Preview with zoom applied */}
                          <div className="mt-4 flex flex-col items-center">
                            <p className="text-xs text-gray-500 mb-2">Preview with zoom</p>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 shadow-md">
                              <img
                                src={memberData.photo.replace('/image/upload/', `/image/upload/c_thumb,g_auto:face,z_${memberData.zoomLevel},ar_1:1,w_200,h_200,q_auto,f_auto/`)}
                                alt="Zoom Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-sm sm:text-base py-2 sm:py-3"
                      disabled={
                        !memberData.name ||
                        !memberData.email ||
                        !memberData.memberRollNumber ||
                        !memberData.size ||
                        !submitPhotoUrl ||
                        isUploadingPhoto ||
                        isSubmitting ||
                        isProcessingPayment ||
                        Object.values(errors).some(error => error) ||
                        !isPhoneVerified
                      }
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>
                          Processing Payment...
                        </span>
                      ) : isUploadingPhoto ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></span>
                          Uploading photo...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          💳 Pay ₹{joinPricing.perItemTotal} & Join Group
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Grid Preview - 2/3 width */}
            <div className="lg:col-span-2 order-2 flex flex-col min-h-0">
              <Card className="shadow-xl border-0 relative flex flex-col flex-1 min-h-[420px] sm:min-h-[520px] lg:min-h-[640px] backdrop-blur-lg bg-white/80">
                <CardHeader className="pb-2 sm:pb-4 shrink-0">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Grid Preview</CardTitle>
                  <CardDescription className="text-sm sm:text-base">{displayTemplate}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 lg:p-8">
                  <div className="flex-1 min-h-[320px] sm:min-h-[400px] flex items-center justify-center w-full">
                    <Suspense fallback={
                      <div className="p-4 sm:p-8 text-center">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-t-purple-600 border-purple-200 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm sm:text-base text-gray-600">Loading preview...</p>
                      </div>
                    }>
                      <div className="relative w-full h-full min-h-[280px] flex items-center justify-center">
                        {availableTemplates.length > 1 && (
                          <>
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-white/80 hover:bg-white shadow-lg rounded-full h-10 w-10"
                                onClick={handlePrevTemplate}
                              >
                                <ChevronLeft className="h-6 w-6 text-gray-700" />
                              </Button>
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-white/80 hover:bg-white shadow-lg rounded-full h-10 w-10"
                                onClick={handleNextTemplate}
                              >
                                <ChevronRight className="h-6 w-6 text-gray-700" />
                              </Button>
                            </div>
                            <div className="absolute top-4 right-4 z-10">
                              <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold uppercase tracking-wider text-gray-600 border border-gray-100">
                                {displayTemplate === 'hexagonal' ? 'Hexagon' : displayTemplate}
                              </span>
                            </div>
                          </>
                        )}
                        {isCloudinaryPhoto ? (
                          <GridPreview
                            template={displayTemplate}
                            memberCount={group.totalMembers}
                            members={[]}
                            centerEmptyDefault
                            activeMember={{
                              id: 'preview',
                              name: memberData.name || 'You',
                              memberRollNumber: memberData.memberRollNumber,
                              photo: memberData.photo,
                              vote: memberData.vote,
                              joinedAt: new Date(),
                              zoomLevel: memberData.zoomLevel
                            }}
                            size="xlarge"
                          />
                        ) : (
                          <div className="space-y-2">
                            <GridPreview
                              template={displayTemplate}
                              memberCount={group.totalMembers}
                              members={[]}
                              centerEmptyDefault
                              size="xlarge"
                            />
                            <p className="text-center text-sm text-gray-500">Upload your photo to see yourself in the center</p>
                          </div>
                        )}
                      </div>
                    </Suspense>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default JoinGroup;
