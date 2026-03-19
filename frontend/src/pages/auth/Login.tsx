import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { loginAsync } from "../../store/authSlice";
import { useAppDispatch } from "../../hooks/redux";
import loginSvg from "../../assets/login.svg";

const RECRUITER_CREDENTIALS = {
  email: "test@gmail.com",
  password: "test1234",
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await dispatch(loginAsync(formData)).unwrap();
      setLoading(false);
      navigate("/dashboard");
    } catch (error: any) {
      setLoading(false);
      setErrors({ general: error || "Login failed. Please try again." });
      toast.error(error || "Login failed. Please try again.");
    }
  };

  const handleUseRecruiterCredentials = () => {
    setFormData(RECRUITER_CREDENTIALS);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
      <div className="flex w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden border border-[#e0e3ef] bg-white">
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-[#e5e7eb] p-10">
          <img src="/logo.png" alt="Know Your Terms" className="h-36 w-36 object-contain mb-6" />
          <h2 className="text-3xl font-bold text-black mb-2 text-center">{t("login.welcome_title")}</h2>
          <p className="text-lg text-gray-700 text-center max-w-xs">{t("login.welcome_left_desc")}</p>
          <img src={loginSvg} alt="Legal Illustration" className="mt-8 w-40" />
        </div>

        <div className="w-full md:w-1/2 bg-[#f9fafb] p-8 md:p-6 flex flex-col justify-center border-l border-[#e0e3ef]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-black mb-1">{t("login.welcome_title")}</h2>
            <p className="text-gray-700 text-sm">{t("login.welcome_right_subtitle")}</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                label="Email address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="Enter your email"
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="rounded-lg border border-[#e6e1d5] bg-[#fff8eb] px-4 py-3 text-sm text-[#5c4a1f]">
              <p className="font-semibold">Recruiter Login (Demo)</p>
              <p>Email: {RECRUITER_CREDENTIALS.email}</p>
              <p>Password: {RECRUITER_CREDENTIALS.password}</p>
              <button
                type="button"
                onClick={handleUseRecruiterCredentials}
                className="mt-2 text-[#1a237e] font-semibold hover:underline"
              >
                Use these credentials
              </button>
            </div>

            {errors.general && <p className="text-sm text-orange-600">{errors.general}</p>}

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center text-sm text-black">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#CDA047] focus:ring-[#CDA047] border-[#e6e1d5]"
                />
                <span className="ml-2">{t("login.remember_me")}</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-br from-[#e5e7eb] via-[#f3f4f6] to-[#f9fafb] text-[#1a237e] font-bold text-lg rounded-full shadow-lg transition border border-[#b1b4b6] hover:bg-[#e0e7ef]"
              size="lg"
              loading={loading}
            >
              {t("auth.sign_in")}
            </Button>

            <p className="text-center text-sm text-gray-700 mt-4">
              {t("login.dont_have_account")}{" "}
              <Link to="/register" className="font-bold text-black hover:underline">
                {t("login.create_one")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
