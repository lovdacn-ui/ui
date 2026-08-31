import { Button } from '@preview/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@preview/components/ui/card';
import { Checkbox } from '@preview/components/ui/checkbox';
import { Input } from '@preview/components/ui/input';
import { Label } from '@preview/components/ui/label';
import { Text } from '@preview/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

/** Preview of the `signup-01` block (docs iframe). */
export function SignupForm01() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agree, setAgree] = React.useState(false);

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="items-center gap-1">
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-2">
          <Label nativeID="name">
            <Text>Name</Text>
          </Label>
          <Input
            aria-labelledby="name"
            value={name}
            onChangeText={setName}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
        </View>
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
          <Label nativeID="password">
            <Text>Password</Text>
          </Label>
          <Input
            aria-labelledby="password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            autoComplete="password-new"
          />
        </View>
        <View className="flex-row items-center gap-2">
          <Checkbox checked={agree} onCheckedChange={setAgree} aria-labelledby="terms-label" />
          <Label nativeID="terms-label" onPress={() => setAgree((prev) => !prev)}>
            <Text className="text-muted-foreground text-sm">
              I agree to the Terms and Privacy Policy
            </Text>
          </Label>
        </View>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button className="w-full" disabled={!agree} onPress={() => {}}>
          <Text>Create account</Text>
        </Button>
        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-muted-foreground text-sm">Already have an account?</Text>
          <Button variant="link" size="sm" className="h-auto p-0" onPress={() => {}}>
            <Text>Sign in</Text>
          </Button>
        </View>
      </CardFooter>
    </Card>
  );
}
