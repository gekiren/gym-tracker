declare module 'expo-image-picker' {
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    base64?: string | null;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export interface PermissionResponse {
    granted: boolean;
    canAskAgain: boolean;
  }

  export function requestCameraPermissionsAsync(): Promise<PermissionResponse>;
  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;
  export function launchCameraAsync(options?: any): Promise<ImagePickerResult>;
  export function launchImageLibraryAsync(options?: any): Promise<ImagePickerResult>;
}

declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp',
  }

  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export interface Action {
    resize?: { width?: number; height?: number };
    rotate?: number;
    flip?: any;
    crop?: any;
  }

  export interface SaveOptions {
    compress?: number;
    format?: SaveFormat;
    base64?: boolean;
  }

  export function manipulateAsync(
    uri: string,
    actions?: Action[],
    saveOptions?: SaveOptions
  ): Promise<ImageResult>;
}
