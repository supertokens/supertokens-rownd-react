type AuthLevel = 'instant' | 'guest' | 'unverified' | 'verified';

type Unsubscribe = () => void;

export type TRowndContext = {
  requestSignIn: (e?: SignInProps) => void;
  signOut: () => void;
  manageAccount: () => void;
  setUser: (e: UserDataContext) => Promise<UserContext>;
  setUserValue: (key: string, value: any) => Promise<UserContext>;
  getAccessToken: (e?: {
    token?: string;
    provider?: string;
    tokenType?: 'id_token' | 'access_token' | string;
    waitForToken?: boolean;
    forceRefresh?: boolean;
    [key: string]: any;
  }) => Promise<string | undefined | null>;
  getFirebaseIdToken: (token: string) => Promise<string>;
  getAppConfig: () => any;
  onAuthenticated: (
    callback: (userData: UserDataContext) => void
  ) => Unsubscribe;
  passkeys: { register: () => void; authenticate: () => void };
  is_authenticated: boolean;
  is_initializing: boolean;
  auth_level?: AuthLevel;
  access_token: string | null;
  auth: AuthContext;
  user: UserContext;
  events: {
    addEventListener: (
      type: string,
      callback: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions | undefined
    ) => void;
    removeEventListener: (
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ) => void;
  };
};

export enum RequestSignInIntent {
  SignUp = 'sign_up',
  SignIn = 'sign_in',
}

export type SignInProps = {
  identifier?: string;
  auto_sign_in?: boolean;
  init_data?: Record<string, string | number | boolean | object>;
  post_login_redirect?: string;
  include_user_data?: boolean;
  redirect?: boolean;
  intent?: RequestSignInIntent;
  group_to_join?: string;
  prevent_closing?: boolean;
} & (
  | {
      method?: string;
    }
  | {
      method: 'one_tap';
      method_options?: {
        prompt_parent_id?: string;
      };
    }
  | {
      method: 'email' | 'phone' | 'google' | 'apple' | 'passkeys' | 'anonymous';
    }
);

type AuthContext = {
  access_token: string | null;
  app_id?: string;
  is_authenticated: boolean;
  is_verified_user?: boolean;
  auth_level?: AuthLevel;
};

export type UserContext = {
  data: UserDataContext;
  groups: UserGroup[];
  redacted_fields: string[];
  verified_data: {
    [key: string]: any | null;
  };
  meta: {
    [key: string]: any | null;
  };
  instant_user?: {
    is_initializing: boolean;
  };
  is_loading: boolean;
};

export type UserDataContext = {
  user_id?: string;
  email?: string | null;
  phone?: string | null;
  [key: string]: any;
};

export interface UserGroup {
  group: Group;
  member: GroupMember;
}

export interface Group {
  id: string;
  name: string;
  app_id: string;
  admission_policy: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface GroupMember {
  id: string;
  app_id: string;
  user_id: string;
  roles: string[];
  group_id: string;
  state: string;
  invited_by?: string;
  added_by?: string;
  updated_at?: Date;
  updated_by?: string;
}
