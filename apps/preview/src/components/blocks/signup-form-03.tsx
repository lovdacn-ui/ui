import { Button } from "@preview/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@preview/components/ui/card";
import { Icon } from "@preview/components/ui/icon";
import { Input } from "@preview/components/ui/input";
import { Label } from "@preview/components/ui/label";
import { Text } from "@preview/components/ui/text";
import { usePreviewNavigation } from "@preview/components/preview-navigation";
import { GalleryVerticalEnd } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

/** Preview of the `signup-03` block (docs iframe). */
export function SignupForm03() {
  const navigate = usePreviewNavigation();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");

  return (
    <View className="mx-auto w-full max-w-sm gap-6">
      <View className="flex-row items-center justify-center gap-2">
        <View className="bg-primary size-7 items-center justify-center rounded-lg">
          <Icon
            as={GalleryVerticalEnd}
            className="text-primary-foreground"
            size={16}
          />
        </View>
        <Text className="font-medium">Acme Inc.</Text>
      </View>

      <Card>
        <CardHeader className="items-center gap-1">
          <CardTitle className="text-center text-xl">
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details below to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="gap-2">
            <Label nativeID="name-signup-03">
              <Text>Full name</Text>
            </Label>
            <Input
              aria-labelledby="name-signup-03"
              value={name}
              onChangeText={setName}
              placeholder="Ada Lovelace"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="email-signup-03">
              <Text>Email</Text>
            </Label>
            <Input
              aria-labelledby="email-signup-03"
              value={email}
              onChangeText={setEmail}
              placeholder="m@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View className="gap-4 sm:flex-row">
            <View className="flex-1 gap-2">
              <Label nativeID="password-signup-03">
                <Text>Password</Text>
              </Label>
              <Input
                aria-labelledby="password-signup-03"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                autoComplete="password-new"
                returnKeyType="next"
              />
            </View>
            <View className="flex-1 gap-2">
              <Label nativeID="confirm-signup-03">
                <Text>Confirm</Text>
              </Label>
              <Input
                aria-labelledby="confirm-signup-03"
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder="Repeat password"
                secureTextEntry
                autoComplete="password-new"
                returnKeyType="done"
              />
            </View>
          </View>

          <Text className="text-muted-foreground text-xs">
            Use at least 8 characters for your password.
          </Text>

          <Button className="w-full" onPress={() => {}}>
            <Text>Create account</Text>
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-muted-foreground text-sm">
              Already have an account?
            </Text>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onPress={() => navigate("login-03")}
            >
              <Text>Sign in</Text>
            </Button>
          </View>
        </CardContent>
      </Card>

      <Text className="text-muted-foreground px-6 text-center text-xs leading-5">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}
