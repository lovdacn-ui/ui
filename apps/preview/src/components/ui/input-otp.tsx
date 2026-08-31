import { Pressable, TextInput, View } from '@preview/components/ui/primitives';
import { Text } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import * as React from 'react';
import { Platform } from 'react-native';

type InputOTPContextValue = {
  value: string;
  maxLength: number;
  focused: boolean;
  activeIndex: number;
};

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTPContext() {
  const context = React.useContext(InputOTPContext);
  if (!context) {
    throw new Error('InputOTP compound components must be used within <InputOTP>.');
  }
  return context;
}

type InputOTPProps = Omit<
  React.ComponentProps<typeof TextInput>,
  'value' | 'onChangeText' | 'maxLength'
> & {
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
  children: React.ReactNode;
  /** Class applied to the row wrapper. */
  className?: string;
};

/**
 * One-time-password input. Renders a transparent `TextInput` overlaying the slot
 * boxes: tapping anywhere focuses it, and each keystroke fills the next slot.
 * Supports iOS/Android OTP autofill via `textContentType`/`autoComplete`.
 */
function InputOTP({
  value,
  onChangeText,
  maxLength = 6,
  children,
  className,
  ...props
}: InputOTPProps) {
  const inputRef = React.useRef<TextInput>(null);
  const [focused, setFocused] = React.useState(false);
  const activeIndex = Math.min(value.length, maxLength - 1);

  const context = React.useMemo<InputOTPContextValue>(
    () => ({ value, maxLength, focused, activeIndex }),
    [value, maxLength, focused, activeIndex]
  );

  return (
    <InputOTPContext.Provider value={context}>
      <Pressable
        className={cn('relative flex-row items-center', className)}
        onPress={() => inputRef.current?.focus()}
      >
        {children}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\s/g, '').slice(0, maxLength))}
          maxLength={maxLength}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          caretHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 opacity-0"
          {...props}
        />
      </Pressable>
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex-row items-center gap-2', className)} {...props} />;
}

type InputOTPSlotProps = React.ComponentProps<typeof View> & {
  index: number;
};

function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
  const { value, focused, activeIndex, maxLength } = useInputOTPContext();
  const char = value[index] ?? '';
  const isActive =
    focused && (activeIndex === index || (value.length === maxLength && index === maxLength - 1));

  return (
    <View
      className={cn(
        'border-input bg-background h-12 w-11 items-center justify-center rounded-md border',
        isActive && 'border-ring border-2',
        Platform.select({ web: 'transition-all' }),
        className
      )}
      {...props}
    >
      {char ? (
        <Text className="text-foreground text-lg font-medium">{char}</Text>
      ) : isActive ? (
        <View className="bg-foreground h-5 w-px" />
      ) : null}
    </View>
  );
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      role="presentation"
      className={cn('items-center justify-center px-1', className)}
      {...props}
    >
      <View className="bg-border h-1 w-2 rounded-full" />
    </View>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
