import { Button } from '@preview/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@preview/components/ui/card';
import { Input } from '@preview/components/ui/input';
import { Label } from '@preview/components/ui/label';
import { Text } from '@preview/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

/** Preview of the `login-01` block (docs iframe). */
export function LoginForm01() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="items-center gap-1">
        <CardTitle className="text-xl">Sign in to your account</CardTitle>
        <CardDescription>Enter your email below to sign in</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-2">
          <Label nativeID="email">
            <Text>Email</Text>
          </Label>
          <Input
            aria-labelledby="email"
            value={email}
            onChangeText={setEmail}
            placeholder="m@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label nativeID="password">
              <Text>Password</Text>
            </Label>
            <Button variant="link" size="sm" className="h-auto p-0" onPress={() => {}}>
              <Text>Forgot password?</Text>
            </Button>
          </View>
          <Input
            aria-labelledby="password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
          />
        </View>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button className="w-full" onPress={() => {}}>
          <Text>Sign in</Text>
        </Button>
        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-muted-foreground text-sm">Don&apos;t have an account?</Text>
          <Button variant="link" size="sm" className="h-auto p-0" onPress={() => {}}>
            <Text>Sign up</Text>
          </Button>
        </View>
      </CardFooter>
    </Card>
  );
}
