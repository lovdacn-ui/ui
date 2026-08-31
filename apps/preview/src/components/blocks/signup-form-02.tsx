import { Button } from "@preview/components/ui/button";
import { Icon } from "@preview/components/ui/icon";
import { Input } from "@preview/components/ui/input";
import { Label } from "@preview/components/ui/label";
import { Separator } from "@preview/components/ui/separator";
import { Text } from "@preview/components/ui/text";
import { usePreviewNavigation } from "@preview/components/preview-navigation";
import { GalleryVerticalEnd, GitFork } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

/** Preview of the `signup-02` block (docs iframe). */
export function SignupForm02() {
  const navigate = usePreviewNavigation();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");

  return (
    <View className="border-border bg-card mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border shadow-sm md:flex-row">
      <View className="flex-1 gap-5 p-6 sm:p-8 md:p-10">
        <View className="flex-row items-center gap-2">
          <View className="bg-primary size-7 items-center justify-center rounded-lg">
            <Icon
              as={GalleryVerticalEnd}
              className="text-primary-foreground"
              size={16}
            />
          </View>
          <Text className="font-medium">Acme Inc.</Text>
        </View>

        <View className="gap-1">
          <Text className="text-2xl font-bold">Create your account</Text>
          <Text className="text-muted-foreground text-sm">
            Fill in your details to get started
          </Text>
        </View>

        <View className="gap-2">
          <Label nativeID="name-signup-02">
            <Text>Full name</Text>
          </Label>
          <Input
            aria-labelledby="name-signup-02"
            value={name}
            onChangeText={setName}
            placeholder="Ada Lovelace"
            autoComplete="name"
            returnKeyType="next"
          />
        </View>

        <View className="gap-2">
          <Label nativeID="email-signup-02">
            <Text>Email</Text>
          </Label>
          <Input
            aria-labelledby="email-signup-02"
            value={email}
            onChangeText={setEmail}
            placeholder="m@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <Text className="text-muted-foreground text-xs">
            We&apos;ll only use this address for your account.
          </Text>
        </View>

        <View className="gap-4 sm:flex-row">
          <View className="flex-1 gap-2">
            <Label nativeID="password-signup-02">
              <Text>Password</Text>
            </Label>
            <Input
              aria-labelledby="password-signup-02"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoComplete="password-new"
              returnKeyType="next"
            />
          </View>
          <View className="flex-1 gap-2">
            <Label nativeID="confirm-signup-02">
              <Text>Confirm password</Text>
            </Label>
            <Input
              aria-labelledby="confirm-signup-02"
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Repeat your password"
              secureTextEntry
              autoComplete="password-new"
              returnKeyType="done"
            />
          </View>
        </View>

        <Button className="w-full" onPress={() => {}}>
          <Text>Create account</Text>
        </Button>

        <View className="flex-row items-center gap-3">
          <Separator className="flex-1" />
          <Text className="text-muted-foreground text-xs">OR</Text>
          <Separator className="flex-1" />
        </View>

        <Button variant="outline" className="w-full" onPress={() => {}}>
          <Icon as={GitFork} />
          <Text>Sign up with GitHub</Text>
        </Button>

        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-muted-foreground text-sm">
            Already have an account?
          </Text>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onPress={() => navigate("login-04")}
          >
            <Text>Sign in</Text>
          </Button>
        </View>

        <Text className="text-muted-foreground text-center text-xs leading-5">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy.
        </Text>
      </View>

      <View className="bg-primary hidden min-h-[650px] w-2/5 justify-between p-8 md:flex">
        <View className="bg-primary-foreground/15 size-12 items-center justify-center rounded-2xl">
          <Icon
            as={GalleryVerticalEnd}
            className="text-primary-foreground"
            size={24}
          />
        </View>
        <View className="gap-3">
          <Text className="text-primary-foreground text-3xl font-bold leading-tight">
            Build better products with your team.
          </Text>
          <Text className="text-primary-foreground/80 leading-6">
            Create an account to organize projects, share feedback, and turn
            ideas into progress.
          </Text>
        </View>
      </View>
    </View>
  );
}
