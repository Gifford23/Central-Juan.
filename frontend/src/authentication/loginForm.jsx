import React from 'react';
import TextField from '@mui/material/TextField';
import { Checkbox, FormControlLabel } from '@mui/material';

const LoginForm = ({
  username,
  password,
  passwordVisible,
  setUsername,
  setPassword,
  togglePasswordVisibility,
}) => {
  return (
    <section className="login-input">
        <TextField type="text"
            placeholder='CJIS-XXXX-XXXX'
            label="Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className=''
            
        />
        <TextField type={passwordVisible ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            
        />
    </section>
  );
};

export default LoginForm;
