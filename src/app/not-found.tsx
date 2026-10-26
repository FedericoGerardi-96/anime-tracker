import Link from 'next/link';
import './not-found.css';

const NotFound = () => {
  return (
    <div className='mt-20'>
      <div className='row'>
        <div>
          <div className='text-404'>
            <b>404</b>
          </div>
          <div className='text'>
            <b> PAGE NOT FOUND </b>
          </div>
          <div className='flex justify-center items-center mt-10'>
            <Link
              href='/'
              className='flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer'>
              <span className='material-symbols-outlined' style={{ fontVariationSettings: "'FILL' 1" }}>
                arrow_back
              </span>
              <span className='uppercase text-xs tracking-widest'>BACK TO HOME</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
