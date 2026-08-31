import { Button } from '@preview/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@preview/components/ui/card';
import { Icon } from '@preview/components/ui/icon';
import { Input } from '@preview/components/ui/input';
import { Label } from '@preview/components/ui/label';
import { Separator } from '@preview/components/ui/separator';
import { Text } from '@preview/components/ui/text';
import { Apple, Mail } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

/** Preview of the `login-02` block (docs iframe). */
export function LoginForm02() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="items-center gap-1">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in with a provider or your email</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-2">
          <Button variant="outline" className="w-full" onPress={() => {}}>
            <Icon as={Apple} />
            <Text>Continue with Apple</Text>
          </Button>
          <Button variant="outline" className="w-full" onPress={() => {}}>
            <Icon as={Mail} />
            <Text>Continue with Google</Text>
          </Button>
        </View>
        <View className="flex-row items-center gap-3">
          <Separator className="flex-1" />
          <Text className="text-muted-foreground text-xs">OR CONTINUE WITH</Text>
          <Separator className="flex-1" />
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
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
          />
        </View>
        <Button className="w-full" onPress={() => {}}>
          <Text>Sign in</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
