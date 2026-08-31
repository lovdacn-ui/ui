import { Button } from "@preview/components/ui/button";
import { Card } from "@preview/components/ui/card";
import { Icon } from "@preview/components/ui/icon";
import { Input } from "@preview/components/ui/input";
import { Label } from "@preview/components/ui/label";
import { Separator } from "@preview/components/ui/separator";
import { Text } from "@preview/components/ui/text";
import { usePreviewNavigation } from "@preview/components/preview-navigation";
import { Apple, GalleryVerticalEnd, GitFork, Mail } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

/** Preview of the `login-04` block (docs iframe). */
export function LoginForm04() {
  const navigate = usePreviewNavigation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <View className="mx-auto w-full max-w-4xl gap-4">
      <Card className="w-full gap-0 py-0 md:flex-row">
        <View className="flex-1 gap-5 p-6 sm:p-8">
          <View className="items-center gap-1">
            <Text className="text-center text-2xl font-bold">Welcome back</Text>
            <Text className="text-muted-foreground text-center text-sm">
              Sign in to your Acme Inc. account
            </Text>
          </View>

          <View className="gap-2">
            <Label nativeID="email-04">
              <Text>Email</Text>
            </Label>
            <Input
              aria-labelledby="email-04"
              value={email}
              onChangeText={setEmail}
              placeholder="m@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Label nativeID="password-04">
                <Text>Password</Text>
              </Label>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onPress={() => {}}
              >
                <Text>Forgot password?</Text>
              </Button>
            </View>
            <Input
              aria-labelledby="password-04"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
            />
          </View>

          <Button className="w-full" onPress={() => {}}>
            <Text>Sign in</Text>
          </Button>

          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground text-xs">
              OR CONTINUE WITH
            </Text>
            <Separator className="flex-1" />
          </View>

          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              accessibilityLabel="Sign in with Apple"
              onPress={() => {}}
            >
              <Icon as={Apple} />
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              accessibilityLabel="Sign in with Google"
              onPress={() => {}}
            >
              <Icon as={Mail} />
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              accessibilityLabel="Sign in with GitHub"
              onPress={() => {}}
            >
              <Icon as={GitFork} />
            </Button>
          </View>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-muted-foreground text-sm">
              Don&apos;t have an account?
            </Text>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onPress={() => navigate("signup-02")}
            >
              <Text>Sign up</Text>
            </Button>
          </View>
        </View>

        <View className="bg-primary hidden min-h-[500px] w-2/5 justify-between p-8 md:flex">
          <View className="bg-primary-foreground/15 size-12 items-center justify-center rounded-2xl">
            <Icon
              as={GalleryVerticalEnd}
              className="text-primary-foreground"
              size={24}
            />
          </View>
          <View className="gap-3">
            <Text className="text-primary-foreground text-3xl font-bold leading-tight">
              Everything your team needs, in one place.
            </Text>
            <Text className="text-primary-foreground/80 leading-6">
              Sign in to continue collaborating, tracking progress, and shipping
              great work.
            </Text>
          </View>
        </View>
      </Card>

      <Text className="text-muted-foreground px-6 text-center text-xs leading-5">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}
