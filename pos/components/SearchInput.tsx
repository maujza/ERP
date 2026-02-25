import { Search } from '@/components/icons/search';
import { clx } from '@/utils/clx';
import { TextInput, View } from 'react-native';

export const SearchInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChangeText, placeholder = 'Search...', className }) => {
  return (
    <View className={clx('relative', className)}>
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-[50%] text-gray-300" />
      <TextInput
        className="rounded-full border border-gray-200 py-3 pl-10 pr-4 text-sm placeholder:text-gray-300 focus:border-active-500"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        inputMode="search"
      />
    </View>
  );
};
