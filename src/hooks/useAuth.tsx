import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';
const { CLIENT_ID } = process.env;

import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

interface AuthResponse{
  params:{
    error?:string;
    state:string;
    access_token:string;
  },
  type:string;
}



const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke'
};

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  // get CLIENT_ID from environment variables

  async function signIn() {
    try {
        setIsLoggingIn(true)

      
         const REDIRECT_URI=makeRedirectUri({useProxy:true})
         const RESPONSE_TYPE = 'token'
         const SCOPE = encodeURI("openid user:read:email user:read:follows")
         const FORCE_VERIFY = true;
         const STATE = generateRandom(30);

         const authUrl = twitchEndpoints.authorization + 
          `?client_id=${CLIENT_ID}` + 
          `&redirect_uri=${REDIRECT_URI}` + 
          `&response_type=${RESPONSE_TYPE}` + 
          `&scope=${SCOPE}` + 
          `&force_verify=${FORCE_VERIFY}` +
          `&state=${STATE}`;


        
          const {type,params} = await startAsync({authUrl}) as AuthResponse;

          if(type && params.error!='access_denied'){
            if(params.state!=STATE){
              throw new Error('Invalid state value')
            }
            api.defaults.headers.authorization = `Bearer ${params.access_token}`;

            const userResponse:User= await api.get('/users');

            setUser(userResponse.data.data[0]);
            console.log()
            setUserToken(params.access_token);


          }

  
    } catch (error:any) {
      setIsLoggingIn(false);
      throw new Error(error)
      
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function signOut() {
    try {
      setIsLoggingOut(true);

      await revokeAsync({token:userToken,clientId:CLIENT_ID})

      // call revokeAsync with access_token, client_id and twitchEndpoint revocation
    } catch (error) {
    } finally {
      setUser({})
      setUserToken('')
      delete api.defaults.headers.authorization;
      setIsLoggingOut(false);


    }
  }

  useEffect(() => {

    api.defaults.headers['Client-Id'] = CLIENT_ID;
    


  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}>
      { children }
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
