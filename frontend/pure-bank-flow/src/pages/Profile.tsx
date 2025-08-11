import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, SendRequest } from "@/lib/banking-api";
import CardsManager from "@/components/CardsManager";
import { User, Mail, Phone, Lock, Save, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const userData = getCurrentUser();
    setUser(userData);
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "+1 (555) 123-4567",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validatePasswordChange = () => {
    if (!formData.currentPassword) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password to continue",
        variant: "destructive",
      });
      return false;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "New password must be at least 8 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);

    try {
      await SendRequest("/profile/update", {
        name: formData.name,
        phone: formData.phone
      });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved",
      });

      setIsEditing(false);
      
      // Update local user data
      const updatedUser = { ...user, name: formData.name, phone: formData.phone };
      setUser(updatedUser);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordChange()) return;

    setIsLoading(true);

    try {
      await SendRequest("/profile/update", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully",
      });

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <BankingLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading profile...</p>
        </div>
      </BankingLayout>
    );
  }

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and security settings</p>
        </div>

  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarFallback className="text-2xl bg-banking-primary text-white">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Premium Customer</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>Email Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>Phone Verified</span>
                  </div>
                </div>
                {/* Fizikai kártyák kezelése */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">Fizikai kártyák</h3>
                  <CardsManager accountId={user.accounts?.[0]?.id || ""} cardHolder={user.name || ""} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList>
                <TabsTrigger value="personal">Personal Information</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your personal details</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          value={formData.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed. Contact support for assistance.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Customer ID</Label>
                        <Input
                          value={user.id || "N/A"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-4">
                        <Button
                          onClick={handleUpdateProfile}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your password and security preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Change Password
                      </h4>
                      
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label>Current Password</Label>
                          <Input
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                            placeholder="Enter your current password"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>New Password</Label>
                          <Input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => handleInputChange("newPassword", e.target.value)}
                            placeholder="Enter new password (min. 8 characters)"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Confirm New Password</Label>
                          <Input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                            placeholder="Confirm your new password"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleChangePassword}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>

                    <div className="pt-6 border-t">
                      <h4 className="font-medium mb-4">Security Information</h4>
                      <div className="grid gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Two-Factor Authentication</span>
                          <span className="text-success font-medium">Enabled</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Login</span>
                          <span>Today at 9:30 AM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Login Location</span>
                          <span>New York, NY</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication Preferences</CardTitle>
                    <CardDescription>Manage how you receive updates from us</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">Receive account alerts and updates</p>
                        </div>
                        <Button variant="outline" size="sm">Enabled</Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">SMS Notifications</h4>
                          <p className="text-sm text-muted-foreground">Get text alerts for transactions</p>
                        </div>
                        <Button variant="outline" size="sm">Enabled</Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing Communications</h4>
                          <p className="text-sm text-muted-foreground">Promotional offers and updates</p>
                        </div>
                        <Button variant="outline" size="sm">Disabled</Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Monthly Statements</h4>
                          <p className="text-sm text-muted-foreground">Electronic statements delivery</p>
                        </div>
                        <Button variant="outline" size="sm">Email</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </BankingLayout>
  );
};

export default Profile;